import { describe, expect, it } from "vitest";
import { RequestQueue } from "./queue.ts";

/** Vacía la cola de microtareas pendientes para que las tareas encoladas arranquen su cuerpo. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Promesa diferida: resuelve/rechaza a mano para controlar el orden sin temporizadores. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("RequestQueue", () => {
  it("con concurrency=1 ejecuta en serie y respeta el orden FIFO", async () => {
    const queue = new RequestQueue(1);
    const order: number[] = [];
    const d1 = deferred<void>();
    const d2 = deferred<void>();

    const p1 = queue.enqueue(async () => {
      order.push(1);
      await d1.promise;
      order.push(11);
    });
    const p2 = queue.enqueue(async () => {
      order.push(2);
      await d2.promise;
      order.push(22);
    });

    // Solo la primera tarea arrancó; la segunda espera su turno.
    await flush();
    expect(order).toEqual([1]);

    d1.resolve();
    await p1;
    await flush();
    expect(order).toEqual([1, 11, 2]);

    d2.resolve();
    await p2;
    expect(order).toEqual([1, 11, 2, 22]);
  });

  it("permite hasta `concurrency` tareas en paralelo", async () => {
    const queue = new RequestQueue(2);
    const started: number[] = [];
    const d1 = deferred<void>();
    const d2 = deferred<void>();
    const d3 = deferred<void>();

    const p1 = queue.enqueue(async () => {
      started.push(1);
      await d1.promise;
    });
    const p2 = queue.enqueue(async () => {
      started.push(2);
      await d2.promise;
    });
    const p3 = queue.enqueue(async () => {
      started.push(3);
      await d3.promise;
    });

    await flush();
    // Con concurrency=2 arrancan las dos primeras, la tercera espera.
    expect(started).toEqual([1, 2]);

    d1.resolve();
    await p1;
    await flush();
    expect(started).toEqual([1, 2, 3]);

    d2.resolve();
    d3.resolve();
    await Promise.all([p2, p3]);
  });

  it("propaga el valor de retorno de la tarea", async () => {
    const queue = new RequestQueue(1);
    await expect(queue.enqueue(async () => 42)).resolves.toBe(42);
  });

  it("propaga el error de una tarea que rechaza", async () => {
    const queue = new RequestQueue(1);
    const boom = new Error("boom");
    await expect(queue.enqueue(async () => Promise.reject(boom))).rejects.toBe(boom);
  });

  it("una tarea que rechaza no rompe la cola: las siguientes siguen ejecutándose", async () => {
    const queue = new RequestQueue(1);
    const results: string[] = [];

    const pFail = queue.enqueue(async () => {
      throw new Error("falla");
    });
    const pOk = queue.enqueue(async () => {
      results.push("siguiente");
      return "ok";
    });

    await expect(pFail).rejects.toThrow("falla");
    await expect(pOk).resolves.toBe("ok");
    expect(results).toEqual(["siguiente"]);
  });
});
