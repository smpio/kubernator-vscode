const CACHE_PROP = Symbol('ttlCache');

export function ttlCache(ttlMs: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    let method = descriptor.value!;

    descriptor.value = function cached () {
      let cache = (this as any)[CACHE_PROP];

      if (!cache || Date.now() - cache.time > ttlMs) {
        cache = (this as any)[CACHE_PROP] = {
          value: method.apply(this, arguments),
          time: Date.now(),
        };
      }
      return cache.value;
    };
  };
}
