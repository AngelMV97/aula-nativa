// client/src/hooks/useAutoHideNav.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for auto-hiding navigation with configurable behavior
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled - Whether auto-hide is enabled
 * @param {number} options.hideDelay - Milliseconds before hiding (default: 5000)
 * @param {boolean} options.showOnTap - Show on non-interactive tap (default: true)
 * @param {boolean} options.showOnScroll - Show on scroll (default: false)
 * @param {string} options.scrollDirection - 'up' or 'down' to show (default: 'up')
 */
export function useAutoHideNav(options = {}) {
  const {
    enabled = true,
    hideDelay = 5000,
    showOnTap = true,
    showOnScroll = false,
    scrollDirection = 'up'
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const lastScrollY = useRef(0);
  const [userInteracted, setUserInteracted] = useState(false);

  // Clear hide timer
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Start hide timer
  const startHideTimer = useCallback(() => {
    if (!enabled) return;
    
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [enabled, hideDelay, clearHideTimer]);

  // Show navbar and restart timer
  const showAndResetTimer = useCallback(() => {
    if (!enabled) return;
    
    setIsVisible(true);
    setUserInteracted(true);
    startHideTimer();
  }, [enabled, startHideTimer]);

  // Handle tap/click on non-interactive elements
  useEffect(() => {
    if (!enabled || !showOnTap) return;

    const handleClick = (e) => {
      // Check if clicked element is interactive
      const target = e.target;
      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[onclick]');

      if (!isInteractive) {
        showAndResetTimer();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [enabled, showOnTap, showAndResetTimer]);

  // Handle scroll behavior
  useEffect(() => {
    if (!enabled || !showOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY.current;
      const scrollingDown = currentScrollY > lastScrollY.current;

      if (scrollDirection === 'up' && scrollingUp) {
        setIsVisible(true);
        clearHideTimer();
      } else if (scrollDirection === 'down' && scrollingDown) {
        setIsVisible(false);
      } else if (scrollDirection === 'up' && scrollingDown) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, showOnScroll, scrollDirection, clearHideTimer]);

  // Initial hide timer on mount
  useEffect(() => {
    if (enabled && !userInteracted) {
      startHideTimer();
    }

    return () => clearHideTimer();
  }, [enabled, startHideTimer, clearHideTimer, userInteracted]);

  return {
    isVisible,
    show: showAndResetTimer,
    hide: () => setIsVisible(false),
    toggle: () => setIsVisible(prev => !prev)
  };
}
