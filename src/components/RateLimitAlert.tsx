/**
 * Rate Limit Alert Component
 *
 * Displays a prominent alert when API rate limits are reached during execution.
 * Shows a countdown timer indicating when the request will be retried.
 */

import { useEffect, useState } from 'react';

interface RateLimitAlertProps {
  /** Number of seconds until retry */
  retryAfter: number;
  /** Optional callback when countdown reaches zero */
  onRetry?: () => void;
  /** Optional callback to dismiss the alert */
  onDismiss?: () => void;
}

/**
 * RateLimitAlert Component
 *
 * Visual feedback for rate limit waits with countdown timer.
 * Uses amber/orange styling to indicate waiting state (not an error).
 */
export const RateLimitAlert = ({ retryAfter, onRetry, onDismiss }: RateLimitAlertProps) => {
  const [secondsRemaining, setSecondsRemaining] = useState(retryAfter);

  useEffect(() => {
    setSecondsRemaining(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onRetry?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          onRetry?.();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onRetry]);

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-30 animate-slide-down">
      <div className="bg-amber-50 border-2 border-amber-400 rounded-lg shadow-lg p-4 min-w-[400px]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white text-xl">
              ⏳
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-amber-900 font-semibold text-sm mb-1">
              Rate Limit Queue
            </h3>
            <p className="text-amber-800 text-sm mb-2">
              API rate limit reached. Request queued.
            </p>

            {/* Countdown Timer */}
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 border border-amber-300 rounded px-3 py-1.5">
                <span className="text-amber-900 font-mono font-semibold text-lg">
                  {secondsRemaining}s
                </span>
              </div>
              <span className="text-amber-700 text-sm">
                Retrying in {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}...
              </span>
            </div>

            {/* Info Link */}
            <div className="mt-2">
              <a
                href="https://platform.openai.com/docs/guides/rate-limits"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-600 hover:text-amber-800 underline"
              >
                Learn about rate limits
              </a>
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
              title="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-amber-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${((retryAfter - secondsRemaining) / retryAfter) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RateLimitAlert;
