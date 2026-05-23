import time
from collections import OrderedDict
from typing import TypeVar

T = TypeVar("T")

class LRUCache:
    def __init__(self, maxsize: int = 128, ttl: int = 300) -> None:
        self._cache: OrderedDict[str, tuple[float, object]] = OrderedDict()
        self.maxsize = maxsize
        self.ttl = ttl

    def get(self, key: str) -> object | None:
        if key not in self._cache:
            return None
        ts, value = self._cache[key]
        if time.monotonic() - ts > self.ttl:
            del self._cache[key]
            return None
        self._cache.move_to_end(key)
        return value

    def set(self, key: str, value: object) -> None:
        self._cache[key] = (time.monotonic(), value)
        self._cache.move_to_end(key)
        while len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)


_search_cache = LRUCache(maxsize=256, ttl=300)
