import threading
import time
from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30.0) -> None:
        self._failure_threshold = failure_threshold
        self._recovery_timeout = recovery_timeout
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    def call(self, func, *args, **kwargs):
        with self._lock:
            if self._state == CircuitState.OPEN:
                if time.monotonic() - self._last_failure_time >= self._recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerError("Circuit is open")

        try:
            result = func(*args, **kwargs)
            with self._lock:
                if self._state == CircuitState.HALF_OPEN:
                    self._state = CircuitState.CLOSED
                self._failure_count = 0
            return result
        except Exception as e:
            with self._lock:
                self._failure_count += 1
                self._last_failure_time = time.monotonic()
                if self._failure_count >= self._failure_threshold:
                    self._state = CircuitState.OPEN
            raise e

    def reset(self) -> None:
        with self._lock:
            self._state = CircuitState.CLOSED
            self._failure_count = 0


class CircuitBreakerError(Exception):
    pass


_llm_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=30.0)
_embedding_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60.0)


def get_llm_breaker() -> CircuitBreaker:
    return _llm_breaker


def get_embedding_breaker() -> CircuitBreaker:
    return _embedding_breaker
