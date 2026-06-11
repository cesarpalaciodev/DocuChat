import threading
import time
from collections import deque
from typing import Any, Callable

class IndexingQueue:
    """Bounded job queue for repository indexing with semaphore-based concurrency control."""

    def __init__(self, max_concurrent: int = 3):
        self._semaphore = threading.BoundedSemaphore(max_concurrent)
        self._queue: deque[tuple[str, Callable, tuple]] = deque()
        self._lock = threading.Lock()
        self._active: dict[str, threading.Thread] = {}
        self._max = max_concurrent
        self._running = True
        self._worker = threading.Thread(target=self._process, daemon=True)
        self._worker.start()

    def submit(self, job_id: str, fn: Callable, *args: Any) -> bool:
        with self._lock:
            if job_id in self._active:
                return False
            self._queue.append((job_id, fn, args))
        return True

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            for i, (jid, _, _) in enumerate(list(self._queue)):
                if jid == job_id:
                    del self._queue[i]
                    return True
            return False

    @property
    def active_count(self) -> int:
        return len(self._active)

    @property
    def pending_count(self) -> int:
        with self._lock:
            return len(self._queue)

    @property
    def max_concurrent(self) -> int:
        return self._max

    def shutdown(self) -> None:
        self._running = False
        with self._lock:
            active = list(self._active.values())
        for t in active:
            t.join(timeout=10)

    def _process(self) -> None:
        while self._running:
            job = None
            with self._lock:
                if self._queue:
                    job = self._queue.popleft()
            if job is None:
                time.sleep(0.5)
                continue
            job_id, fn, args = job
            self._semaphore.acquire()
            t = threading.Thread(target=self._run_job, args=(job_id, fn, args), daemon=True)
            with self._lock:
                self._active[job_id] = t
            t.start()

    def _run_job(self, job_id: str, fn: Callable, args: tuple) -> None:
        try:
            fn(*args)
        finally:
            with self._lock:
                self._active.pop(job_id, None)
            self._semaphore.release()


indexing_queue = IndexingQueue()
