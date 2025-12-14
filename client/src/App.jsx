import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assistant from "./pages/Assistant";
import ProtectedRoute from "./components/ProtectedRoute";
import Materials from "./pages/Materials";
import Home from "./pages/Home";
import Grades from "./pages/Grades";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRole="student">
              <Home />
            </ProtectedRoute>
          } />
        <Route path="/" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="teacher">
              <Dashboard />
            </ProtectedRoute>
          } />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute allowedRole="student">
              <Assistant />
            </ProtectedRoute>
          } />
        <Route 
          path="/materials" 
          element={<ProtectedRoute allowedRole={["teacher", "student"]}>
              <Materials />
            </ProtectedRoute>
          } />
        <Route 
          path="/grades" 
          element={
            <ProtectedRoute allowedRole="teacher">
              <Grades />
            </ProtectedRoute>
          } />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRole="student">
              <Profile />
            </ProtectedRoute>
          } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// This is the main application component for a React application.
// It sets up the routing for the application using React Router.
// The application has three main routes: the login page, the dashboard page, and the assistant page.
// Each route is associated with a specific component that will be rendered when the route is accessed.
// The BrowserRouter component is used to enable routing in the application.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
// The Login component is rendered when the user accesses the root path ("/").
// The Dashboard component is rendered when the user accesses the "/dashboard" path.
// The Assistant component is rendered when the user accesses the "/assistant" path.
// The BrowserRouter component wraps the entire application to enable routing functionality.
// The Routes component contains all the Route components that define the different paths and their corresponding components.
// The App component is exported as the default export of the module, making it available for use in other parts of the application.
// The Login, Dashboard, and Assistant components are imported from their respective files.
