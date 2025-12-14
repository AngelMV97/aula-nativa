// server/grades.js
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Tesseract = require("tesseract.js");
const pdf = require('pdf-parse');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Use Excel, PDF o imágenes.'));
    }
  }
});

module.exports = function (supabase) {
  const router = express.Router();

  // Middleware: require Bearer token authentication
  async function requireAuth(req, res, next) {
    try {
      const authHeader = (req.headers.authorization || req.headers.Authorization || "").toString().trim();
      if (!authHeader) {
        console.warn("requireAuth: no auth header");
        return res.status(401).send("Missing Authorization header");
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        console.warn("requireAuth: malformed header:", authHeader.slice(0, 30));
        return res.status(401).send("Invalid Authorization header format");
      }

      const token = parts[1];
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);

      if (userErr || !userData || !userData.user) {
        console.warn("requireAuth: invalid token or user not found");
        return res.status(401).send("Invalid or expired token");
      }

      req.authUser = userData.user;
      next();
    } catch (err) {
      console.error("requireAuth error:", err);
      res.status(500).send("Authentication error");
    }
  }

  // Student code matching with fuzzy name matching + grade/section filtering
  async function linkStudentCodes(supabase, grades, periodName) {
    // Extract grade and section from period name (e.g., "Período 1 - 8°B")
    let periodGrade = null;
    let periodSection = null;
    
    const gradeMatch = periodName.match(/(\d+)°/);
    const sectionMatch = periodName.match(/°([A-Z0-9]+)/i);
    
    if (gradeMatch) periodGrade = parseInt(gradeMatch[1]);
    if (sectionMatch) periodSection = sectionMatch[1].toUpperCase();
    
    console.log(`\n📚 Period context: Grade ${periodGrade}°, Section ${periodSection}`);

    // Extract unique student codes and names from uploaded grades
    const studentData = grades.map(g => ({
      code: g.student_code || g.studentCode,
      name: (g.student_name || g.studentName || '').trim().toLowerCase()
    })).filter(s => s.code && s.name);

    console.log(`🔍 Starting student code matching for ${studentData.length} students...`);

    for (const { code, name } of studentData) {
      try {
        // Normalize name for matching (remove accents, extra spaces)
        const normalizedName = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim()
          .toLowerCase();

        // Get students from database, filtered by grade and section if available
        let query = supabase
          .from('students')
          .select('id, user_id, name, student_code, grade, section');

        // Filter by grade and section to avoid wrong matches
        if (periodGrade) {
          query = query.eq('grade', periodGrade);
        }
        if (periodSection) {
          query = query.eq('section', periodSection);
        }

        const { data: allStudents, error } = await query;

        if (error) {
          console.warn(`⚠️ Error fetching students:`, error);
          continue;
        }

        if (!allStudents || allStudents.length === 0) {
          console.log(`ℹ️ No students found for grade ${periodGrade}°${periodSection}`);
          continue;
        }

        // Try to find matching student by name similarity
        let bestMatch = null;
        let highestScore = 0;

        for (const student of allStudents) {
          if (student.student_code) {
            // Skip students who already have a code
            continue;
          }

          const studentName = (student.name || '').trim().toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');

          // Calculate similarity score
          let score = 0;

          // Full name match (exact)
          if (studentName === normalizedName) {
            score = 100;
          } 
          // Check if grade sheet name contains student's name
          else if (normalizedName.includes(studentName)) {
            score = 90;
          }
          // Check if student's name contains grade sheet name
          else if (studentName.includes(normalizedName)) {
            score = 85;
          }
          // Check first and last name match
          else {
            const gradeParts = normalizedName.split(' ');
            const studentParts = studentName.split(' ');
            
            // Check if first name matches
            const firstNameMatch = gradeParts[0] === studentParts[0];
            // Check if any last name matches
            const lastNameMatch = gradeParts.some(gp => studentParts.includes(gp));
            
            if (firstNameMatch && lastNameMatch) {
              score = 80;
            } else if (firstNameMatch) {
              score = 50;
            } else if (lastNameMatch) {
              score = 40;
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = student;
          }
        }

        // Only assign code if we have a good match (80%+ confidence)
        if (bestMatch && highestScore > 80) {
          const { error: updateError } = await supabase
            .from('students')
            .update({ student_code: code })
            .eq('id', bestMatch.id);

          if (updateError) {
            console.warn(`⚠️ Could not update student code for ${bestMatch.name}:`, updateError);
          } else {
            console.log(`✅ Assigned code ${code} to ${bestMatch.name} [${bestMatch.grade}°${bestMatch.section}] (${highestScore}% match with "${name}")`);
          }
        } else if (bestMatch) {
          console.log(`⚠️ Low confidence match for "${name}" -> ${bestMatch.name} (${highestScore}%), skipping`);
        } else {
          console.log(`ℹ️ No match found for "${name}" (code: ${code}) in grade ${periodGrade}°${periodSection}`);
        }

      } catch (e) {
        console.warn(`⚠️ Error matching student code ${code}:`, e);
      }
    }

    console.log(`✅ Student code matching complete\n`);
  }

  // POST /api/grades/upload
  // Process uploaded file (Excel, PDF, or image) to extract grades
  router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
      const { uploadType, teacherId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }

      // Verify teacher owns the request
      if (req.authUser.id !== teacherId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      let grades = [];
      let assessmentColumns = [];

      if (uploadType === 'excel') {
        // Parse Excel file with dynamic columns
        try {
          const workbook = XLSX.read(file.buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (data.length < 2) {
            return res.status(400).json({ error: 'El archivo está vacío o no tiene datos' });
          }

          // Find the header row (look for row containing CODIGO and NOMBRE)
          let headerRowIndex = -1;
          let headers = [];
          
          for (let i = 0; i < Math.min(data.length, 10); i++) { // Check first 10 rows
            const row = data[i].map(cell => String(cell || '').trim().toUpperCase());
            
            // Check if this row contains CODIGO and NOMBRE
            const hasCode = row.some(cell => cell === 'CODIGO' || cell === 'CÓDIGO' || cell === 'CODE');
            const hasName = row.some(cell => cell === 'NOMBRE' || cell === 'NAME' || cell === 'ESTUDIANTE');
            
            if (hasCode && hasName) {
              headerRowIndex = i;
              headers = data[i].map(h => String(h || '').trim());
              break;
            }
          }

          if (headerRowIndex === -1) {
            return res.status(400).json({
              error: 'No se encontró la fila de encabezados. El archivo debe tener columnas "CODIGO" y "NOMBRE"'
            });
          }
          
          // Expect at least: CODIGO, NOMBRE, and one or more score columns
          if (headers.length < 3) {
            return res.status(400).json({
              error: 'El archivo debe tener al menos 3 columnas: CODIGO, NOMBRE, y al menos una evaluación'
            });
          }

          // Find the indices of CODIGO and NOMBRE columns
          const codeIndex = headers.findIndex(h => 
            h.toUpperCase() === 'CODIGO' || h.toUpperCase() === 'CÓDIGO' || h.toUpperCase() === 'CODE'
          );
          const nameIndex = headers.findIndex(h => 
            h.toUpperCase() === 'NOMBRE' || h.toUpperCase() === 'NAME' || h.toUpperCase() === 'ESTUDIANTE'
          );

          if (codeIndex === -1 || nameIndex === -1) {
            return res.status(400).json({
              error: 'No se encontraron las columnas CODIGO y NOMBRE'
            });
          }

          // Extract assessment column names (all columns after CODIGO and NOMBRE that have values)
          const startCol = Math.max(codeIndex, nameIndex) + 1;
          assessmentColumns = headers.slice(startCol).filter(h => h && h.trim());

          console.log('Excel header row found at index:', headerRowIndex);
          console.log('Excel headers:', headers);
          console.log('Assessment columns detected:', assessmentColumns);

          // Process data rows (skip after header row)
          for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 2) continue;
            
            const code = String(row[codeIndex] || '').trim();
            const name = String(row[nameIndex] || '').trim();
            
            // Skip empty rows or rows that look like additional headers
            if (!code || !name || code.toUpperCase() === 'CODIGO' || code.toUpperCase() === 'CÓDIGO') continue;

            // Extract all assessment scores
            const assessments = {};
            let validScores = [];

            for (let j = startCol; j < row.length && j - startCol < assessmentColumns.length; j++) {
              const colName = assessmentColumns[j - startCol];
              if (!colName) continue;

              const scoreStr = String(row[j] || '').trim();
              if (!scoreStr) continue;

              const score = parseFloat(scoreStr.replace(',', '.'));
              if (!isNaN(score) && score >= 0 && score <= 5) {
                assessments[colName] = score;
                validScores.push(score);
              }
            }

            // Calculate average
            const avgScore = validScores.length > 0
              ? validScores.reduce((sum, s) => sum + s, 0) / validScores.length
              : 0;

            if (Object.keys(assessments).length > 0) {
              grades.push({
                studentCode: code,
                studentName: name,
                assessments: assessments,
                score: parseFloat(avgScore.toFixed(2))
              });
            }
          }

          if (grades.length === 0) {
            return res.status(400).json({
              error: 'No se encontraron calificaciones válidas. Verifica que las columnas tengan el formato: CODIGO | NOMBRE | Evaluación1 | Evaluación2 | ...'
            });
          }

          console.log(`Successfully extracted ${grades.length} students from Excel`);

        } catch (excelError) {
          console.error('Excel parsing error:', excelError);
          return res.status(400).json({
            error: 'Error al leer el archivo Excel: ' + excelError.message
          });
        }

      } else if (uploadType === 'image') {
        // Use OCR (Tesseract) for images - improved parsing with error tolerance
        try {
          console.log('Starting OCR processing for image...');
            
          const { data: { text } } = await Tesseract.recognize(
            file.buffer,
            'spa',
            {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
              }
            }
          );

          console.log('OCR completed. Extracted text length:', text.length);
          console.log('OCR Full Text:\n', text);

          // Parse OCR text - try to detect if it's a table with multiple columns
          const lines = text.split('\n').filter(l => l.trim());
          
          // Check if this looks like a multi-column table
          const hasTableStructure = lines.some(line => 
            line.includes('|') || 
            line.toLowerCase().includes('tarea') || 
            line.toLowerCase().includes('quiz') || 
            line.toLowerCase().includes('examen') ||
            line.toLowerCase().includes('exposición')
          );

          if (hasTableStructure) {
            console.log('Detected table structure with multiple assessments');
            
            // Try to extract header row with assessment names
            let assessmentNames = [];
            for (const line of lines) {
              const lower = line.toLowerCase();
              if ((lower.includes('tarea') || lower.includes('quiz') || lower.includes('examen') || lower.includes('exposición')) &&
                  !lower.includes('código') && !lower.includes('nombre')) {
                // This might be the header row
                const parts = line.split(/[\|\s]{2,}/).map(s => s.trim()).filter(s => s);
                // Skip first 2 columns (código, nombre)
                const possibleAssessments = parts.slice(2).filter(p => 
                  p.match(/[a-záéíóúñ]/i) && p.length > 2
                );
                if (possibleAssessments.length > 0) {
                  assessmentNames = possibleAssessments;
                  console.log('Found assessment columns:', assessmentNames);
                  break;
                }
              }
            }

            // If no assessments found, use generic names
            if (assessmentNames.length === 0) {
              assessmentNames = ['Evaluación 1', 'Evaluación 2', 'Evaluación 3', 'Evaluación 4'];
            }

            assessmentColumns = assessmentNames;

            // Parse data rows with improved tolerance for OCR errors
            for (const line of lines) {
              const lower = line.trim().toLowerCase();
              
              // Skip header/legend lines
              if (lower.includes('código') || 
                  lower.includes('nombre') || 
                  lower.includes('calificación') ||
                  lower.includes('escala') ||
                  lower.includes('lista de') ||
                  lower.includes('período') ||
                  lower.includes('periodo') ||
                  lower.includes('fecha') ||
                  lower.includes('curso') ||
                  lower.includes('tarea') ||
                  lower.includes('quiz') ||
                  lower.includes('examen') ||
                  lower.includes('exposición') ||
                  lower.includes('nota de aprobación') ||
                  lower.includes('total estudiantes') ||
                  lower.includes('promedio') ||
                  lower.startsWith('===') ||
                  lower.startsWith('---') ||
                  lower.startsWith('|---') ||
                  lower.length < 10) {
                continue;
              }

              // More flexible code matching - find any sequence of 6-8 digits
              const codeMatch = line.match(/\b(\d{6,8})\b/);
              if (!codeMatch) continue;

              let code = codeMatch[1];
              
              // Normalize code to 7 digits (pad with leading zero if 6 digits)
              if (code.length === 6) {
                code = '0' + code;
              } else if (code.length === 8) {
                // Try removing first or last digit
                code = code.substring(1); // Remove first digit
              }

              const restOfLine = line.substring(line.indexOf(codeMatch[1]) + codeMatch[1].length).trim();
              
              // Extract all decimal numbers (scores) - more flexible pattern
              const scoreMatches = restOfLine.match(/(\d[.,]?\d+)/g);
              if (!scoreMatches || scoreMatches.length === 0) continue;

              // Parse scores and filter valid ones
              const scores = scoreMatches
                .map(s => {
                  // Clean up score string
                  let scoreStr = s.replace(/[^\d.,]/g, ''); // Remove non-numeric chars except . and ,
                  scoreStr = scoreStr.replace(',', '.');
                  
                  // Handle cases like "48" -> "4.8", "36" -> "3.6"
                  if (!scoreStr.includes('.')) {
                    const num = parseInt(scoreStr);
                    if (num >= 10 && num <= 50) {
                      scoreStr = (num / 10).toFixed(1);
                    }
                  }
                  
                  return parseFloat(scoreStr);
                })
                .filter(s => !isNaN(s) && s >= 0 && s <= 5);
              
              if (scores.length === 0) continue;

              // Extract name (everything before the first score)
              const firstScore = scoreMatches[0];
              const nameEndIndex = restOfLine.indexOf(firstScore);
              let name = nameEndIndex > 0 ? restOfLine.substring(0, nameEndIndex).trim() : '';
              
              // Clean up name (remove common OCR errors)
              name = name
                .replace(/[|_\-—]{1,}/g, ' ') // Replace separators with space
                .replace(/\s+/g, ' ') // Normalize spaces
                .replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '') // Keep only letters and spaces
                .trim();
              
              // If name is too short or empty, try to extract from the line differently
              if (!name || name.length < 3) {
                // Try to find capital letters sequence
                const nameMatch = line.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/);
                if (nameMatch) {
                  name = nameMatch[1].trim();
                }
              }
              
              if (!name || name.length < 3) continue;

              // Build assessments object
              const assessments = {};
              for (let i = 0; i < Math.min(scores.length, assessmentNames.length); i++) {
                assessments[assessmentNames[i]] = scores[i];
              }

              // Calculate average
              const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

              grades.push({
                studentCode: code,
                studentName: name,
                assessments: assessments,
                score: parseFloat(avgScore.toFixed(2))
              });

              console.log(`✓ Parsed: ${code} | ${name} | Scores: ${scores.join(', ')} | Avg: ${avgScore.toFixed(2)}`);
            }

          } else {
            // Simple format: Code Name SingleScore
            console.log('Detected simple format (code, name, single score)');
            
            const dataLines = lines.filter(line => {
              const trimmed = line.trim().toLowerCase();
              return !(
                trimmed.includes('código') || 
                trimmed.includes('nombre') || 
                trimmed.includes('calificación') ||
                trimmed.includes('escala') ||
                trimmed.includes('nota de aprobación') ||
                trimmed.includes('total estudiantes') ||
                trimmed.includes('promedio') ||
                trimmed.includes('aprobados') ||
                trimmed.includes('reprobados') ||
                trimmed.includes('lista de') ||
                trimmed.includes('período') ||
                trimmed.includes('periodo') ||
                trimmed.includes('fecha') ||
                trimmed.includes('curso') ||
                trimmed.startsWith('===') ||
                trimmed.startsWith('---') ||
                trimmed.length < 10
              );
            });

            console.log('Data lines after filtering:', dataLines.length);

            for (const line of dataLines) {
              // More flexible code matching
              const codeMatch = line.match(/\b(\d{6,8})\b/);
              if (!codeMatch) continue;

              let code = codeMatch[1];
              if (code.length === 6) code = '0' + code;
              else if (code.length === 8) code = code.substring(1);

              // Pattern: Code followed by name, then single score at end
              const match = line.match(/\d{6,8}\s+(.+?)\s+([\d]+[.,]?[\d]*)\s*$/);
              
              if (match) {
                let name = match[1].trim();
                let scoreStr = match[2].replace(',', '.'); 
                
                // Handle scores without decimal point
                if (!scoreStr.includes('.')) {
                  const num = parseInt(scoreStr);
                  if (num >= 10 && num <= 50) {
                    scoreStr = (num / 10).toFixed(1);
                  }
                }
                
                const score = parseFloat(scoreStr);
                
                // Clean up name
                name = name.replace(/[|_\-—]{1,}/g, ' ')
                  .replace(/\s+/g, ' ')
                  .replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '')
                  .trim();
                
                if (score >= 0 && score <= 5 && name.length >= 5) {
                  grades.push({
                    studentCode: code,
                    studentName: name,
                    assessments: { "Nota": score },
                    score: score
                  });
                  console.log(`✓ Parsed: ${code} | ${name} | ${score}`);
                }
              }
            }

            assessmentColumns = ["Nota"];
          }

          if (grades.length === 0) {
            return res.status(400).json({
              error: 'No se pudieron extraer calificaciones de la imagen. El OCR tuvo problemas leyendo el texto. Sugerencias:\n' +
                    '• Asegúrate de que la imagen sea clara y de alta resolución (mínimo 300 DPI)\n' +
                    '• Usa un formato simple: una fila por estudiante con Código | Nombre | Nota(s)\n' +
                    '• Evita fuentes muy estilizadas o texto muy pequeño\n' +
                    '• Convierte el PDF a imagen de alta calidad (PNG) antes de subir\n' +
                    '• O mejor aún, usa un archivo Excel con la misma estructura',
              debug: {
                textLength: text.length,
                totalLines: lines.length,
                hasTableStructure,
                extractedText: text.substring(0, 800),
                suggestion: 'Considera usar formato Excel o PDF (si contiene texto seleccionable) para mejor precisión'
              }
            });
          }

          console.log(`Successfully extracted ${grades.length} students from OCR`);

        } catch (ocrError) {
          console.error('OCR error:', ocrError);
          return res.status(500).json({
            error: 'Error al procesar la imagen con OCR: ' + ocrError.message
          });
        }

      } else if (uploadType === 'pdf') {
        // PDF processing with pdf-parse
        try {
          console.log('Starting PDF processing...');
          
          const pdfData = await pdf(file.buffer);
          const text = pdfData.text;
          
          console.log('PDF extracted. Text length:', text.length);
          console.log('PDF Full Text:\n', text);
          
          // Use similar parsing logic as image OCR
          const lines = text.split('\n').filter(l => l.trim());
          
          // Check for table structure
          const hasTableStructure = lines.some(line => 
            line.includes('|') || 
            line.toLowerCase().includes('tarea') || 
            line.toLowerCase().includes('quiz') || 
            line.toLowerCase().includes('examen') ||
            line.toLowerCase().includes('exposición')
          );

          if (hasTableStructure) {
            console.log('Detected table structure with multiple assessments');
            
            // Multi-column table parsing
            let assessmentNames = [];
            
            // Find header row
            for (const line of lines) {
              const lower = line.toLowerCase();
              if ((lower.includes('tarea') || lower.includes('quiz') || lower.includes('examen') || lower.includes('exposición')) &&
                  !lower.includes('código') && !lower.includes('nombre')) {
                const parts = line.split(/[\|\s]{2,}/).map(s => s.trim()).filter(s => s);
                const possibleAssessments = parts.slice(2).filter(p => 
                  p.match(/[a-záéíóúñ]/i) && p.length > 2
                );
                if (possibleAssessments.length > 0) {
                  assessmentNames = possibleAssessments;
                  console.log('Found assessment columns:', assessmentNames);
                  break;
                }
              }
            }

            if (assessmentNames.length === 0) {
              assessmentNames = ['Evaluación 1', 'Evaluación 2', 'Evaluación 3'];
            }

            assessmentColumns = assessmentNames;

            // Parse data rows
            for (const line of lines) {
              const lower = line.trim().toLowerCase();
              
              if (lower.includes('código') || lower.includes('nombre') || 
                  lower.includes('lista de') || lower.includes('período') || 
                  lower.includes('periodo') || lower.includes('curso') ||
                  lower.includes('fecha') || lower.includes('tarea') ||
                  lower.includes('quiz') || lower.includes('examen') ||
                  lower.includes('exposición') || lower.startsWith('|---') ||
                  lower.startsWith('===') || lower.startsWith('---') ||
                  lower.length < 10) {
                continue;
              }

              const codeMatch = line.match(/(\d{7})/);
              if (!codeMatch) continue;

              const code = codeMatch[1];
              const restOfLine = line.substring(line.indexOf(code) + code.length).trim();
              
              const scoreMatches = restOfLine.match(/(\d+[.,]\d+)/g);
              if (!scoreMatches || scoreMatches.length === 0) continue;

              const scores = scoreMatches.map(s => parseFloat(s.replace(',', '.')))
                .filter(s => s >= 0 && s <= 5);
              
              if (scores.length === 0) continue;

              const firstScore = scoreMatches[0];
              const nameEndIndex = restOfLine.indexOf(firstScore);
              let name = restOfLine.substring(0, nameEndIndex).trim()
                .replace(/\|/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (!name || name.length < 3) continue;

              const assessments = {};
              for (let i = 0; i < Math.min(scores.length, assessmentNames.length); i++) {
                assessments[assessmentNames[i]] = scores[i];
              }

              const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

              grades.push({
                studentCode: code,
                studentName: name,
                assessments: assessments,
                score: parseFloat(avgScore.toFixed(2))
              });

              console.log(`✓ Parsed: ${code} | ${name} | Avg: ${avgScore.toFixed(2)}`);
            }

          } else {
            // Simple format
            console.log('Detected simple format (code, name, single score)');
            
            assessmentColumns = ["Nota"];
            
            for (const line of lines) {
              const lower = line.trim().toLowerCase();
              
              if (lower.includes('código') || lower.includes('nombre') ||
                  lower.includes('lista de') || lower.includes('período') ||
                  lower.includes('periodo') || lower.length < 10) {
                continue;
              }

              const match = line.match(/(\d{7})\s+(.+?)\s+([\d]+[.,][\d]+)\s*$/);
              
              if (match) {
                const code = match[1];
                const name = match[2].trim().replace(/\s+/g, ' ');
                const score = parseFloat(match[3].replace(',', '.'));
                
                if (score >= 0 && score <= 5 && name.length >= 5) {
                  grades.push({
                    studentCode: code,
                    studentName: name,
                    assessments: { "Nota": score },
                    score: score
                  });
                  console.log(`✓ Parsed: ${code} | ${name} | ${score}`);
                }
              }
            }
          }

          if (grades.length === 0) {
            return res.status(400).json({
              error: 'No se encontraron calificaciones en el PDF. Verifica el formato:\n' +
                     '• Asegúrate de que el PDF contenga texto (no solo imágenes)\n' +
                     '• Formato esperado: Código (7 dígitos) | Nombre | Calificación(es)',
              debug: { 
                textLength: text.length, 
                sampleText: text.substring(0, 500),
                suggestion: 'Si el PDF es una imagen escaneada, conviértelo a imagen PNG/JPG o usa Excel'
              }
            });
          }

          console.log(`Successfully extracted ${grades.length} students from PDF`);

        } catch (pdfError) {
          console.error('PDF processing error:', pdfError);
          return res.status(500).json({
            error: 'Error al procesar el PDF: ' + pdfError.message
          });
        }

      } else {
        return res.status(400).json({ error: 'Tipo de archivo no soportado' });
      }

      res.json({
        success: true,
        gradesCount: grades.length,
        assessmentColumns,
        grades
      });

    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ 
        error: 'Error al procesar el archivo: ' + error.message 
      });
    }
  });

  // GET /api/grades/periods
  // Get all periods for a teacher
  router.get('/periods', requireAuth, async (req, res) => {
    try {
      const teacherId = req.query.teacherId || req.authUser.id;

      if (req.authUser.id !== teacherId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { data, error } = await supabase
        .from('grade_periods')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ periods: data || [] });
    } catch (error) {
      console.error('Get periods error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/grades/:periodId
  // Get all grades for a specific period
  router.get('/:periodId', requireAuth, async (req, res) => {
    try {
      const { periodId } = req.params;

      // Verify period belongs to teacher
      const { data: period, error: periodError } = await supabase
        .from('grade_periods')
        .select('teacher_id')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return res.status(404).json({ error: 'Período no encontrado' });
      }

      if (period.teacher_id !== req.authUser.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { data, error } = await supabase
        .from('student_grades')
        .select('*')
        .eq('period_id', periodId)
        .order('student_code', { ascending: true });

      if (error) throw error;

      res.json({ grades: data || [] });
    } catch (error) {
      console.error('Get grades error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/grades/period
  // Create a new period with grades (supports assessments JSONB)
  router.post('/period', requireAuth, async (req, res) => {
    try {
      const { teacherId, periodName, grades } = req.body;

      if (req.authUser.id !== teacherId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (!periodName || !grades || !Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      // Create period
      const { data: periodData, error: periodError } = await supabase
        .from('grade_periods')
        .insert({
          teacher_id: teacherId,
          period_name: periodName
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Insert grades with assessments JSONB support
      const gradesToInsert = grades.map(g => ({
        period_id: periodData.id,
        teacher_id: teacherId,
        student_code: g.student_code || g.studentCode,
        student_name: g.student_name || g.studentName,
        assessments: g.assessments || {},
        score: parseFloat(g.score)
      }));

      const { error: gradesError } = await supabase
        .from('student_grades')
        .insert(gradesToInsert);

      if (gradesError) throw gradesError;

      // Try to link student codes to student records
      await linkStudentCodes(supabase, grades, periodName);

      res.json({
        success: true,
        period: periodData,
        gradesCount: gradesToInsert.length
      });

    } catch (error) {
      console.error('Create period error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/grades/period/:periodId/students
  // Add new students to an existing period
  router.post('/period/:periodId/students', requireAuth, async (req, res) => {
    try {
      const { periodId } = req.params;
      const { teacherId, grades } = req.body;

      if (req.authUser.id !== teacherId) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Verify period belongs to teacher
      const { data: period, error: periodError } = await supabase
        .from('grade_periods')
        .select('teacher_id')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return res.status(404).json({ error: 'Período no encontrado' });
      }

      if (period.teacher_id !== req.authUser.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      // Insert new grades
      const gradesToInsert = grades.map(g => ({
        period_id: periodId,
        teacher_id: teacherId,
        student_code: g.student_code,
        student_name: g.student_name,
        assessments: g.assessments || {},
        score: parseFloat(g.score)
      }));

      const { error: gradesError } = await supabase
        .from('student_grades')
        .insert(gradesToInsert);

      if (gradesError) throw gradesError;

      res.json({
        success: true,
        gradesCount: gradesToInsert.length
      });

    } catch (error) {
      console.error('Add students error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/grades/period/:periodId
  // Delete a period and all its grades
  router.delete('/period/:periodId', requireAuth, async (req, res) => {
    try {
      const { periodId } = req.params;

      // Verify period belongs to teacher
      const { data: period, error: periodError } = await supabase
        .from('grade_periods')
        .select('teacher_id')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return res.status(404).json({ error: 'Período no encontrado' });
      }

      if (period.teacher_id !== req.authUser.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Delete period (cascade will handle grades)
      const { error } = await supabase
        .from('grade_periods')
        .delete()
        .eq('id', periodId);

      if (error) throw error;

      res.json({ success: true, message: 'Período eliminado exitosamente' });

    } catch (error) {
      console.error('Delete period error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/grades/:gradeId
  // Update a single grade
  router.put('/:gradeId', requireAuth, async (req, res) => {
    try {
      const { gradeId } = req.params;
      const { score, assessments } = req.body;

      if (typeof score !== 'number' || score < 0 || score > 5) {
        return res.status(400).json({ error: 'Calificación inválida (debe ser entre 0 y 5)' });
      }

      // Verify grade belongs to teacher
      const { data: grade, error: gradeError } = await supabase
        .from('student_grades')
        .select('teacher_id')
        .eq('id', gradeId)
        .single();

      if (gradeError || !grade) {
        return res.status(404).json({ error: 'Calificación no encontrada' });
      }

      if (grade.teacher_id !== req.authUser.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Update grade
      const updateData = { score, updated_at: new Date().toISOString() };
      if (assessments) {
        updateData.assessments = assessments;
      }

      const { error } = await supabase
        .from('student_grades')
        .update(updateData)
        .eq('id', gradeId);

      if (error) throw error;

      res.json({ success: true, message: 'Calificación actualizada' });

    } catch (error) {
      console.error('Update grade error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/grades/stats/:periodId
  // Get statistics for a period
  router.get('/stats/:periodId', requireAuth, async (req, res) => {
    try {
      const { periodId } = req.params;

      // Verify period belongs to teacher
      const { data: period, error: periodError } = await supabase
        .from('grade_periods')
        .select('teacher_id')
        .eq('id', periodId)
        .single();

      if (periodError || !period) {
        return res.status(404).json({ error: 'Período no encontrado' });
      }

      if (period.teacher_id !== req.authUser.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { data: grades, error } = await supabase
        .from('student_grades')
        .select('score')
        .eq('period_id', periodId);

      if (error) throw error;

      const scores = grades.map(g => g.score);
      const average = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
      
      const passing = scores.filter(s => s >= 3.0).length;
      const failing = scores.filter(s => s < 3.0).length;
      const passingRate = scores.length > 0
        ? Math.round((passing / scores.length) * 100)
        : 0;

      res.json({
        totalStudents: scores.length,
        average: parseFloat(average.toFixed(2)),
        passing,
        failing,
        passingRate
      });

    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};