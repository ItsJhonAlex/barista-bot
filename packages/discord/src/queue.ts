/**
 * Cola con límite de concurrencia a nivel de aplicación. discord.js ya gestiona el rate-limit
 * por-ruta y el backoff ante 429; esto evita que una operación masiva (crear muchos canales o
 * roles) lance cientos de promesas a la vez y sature el proceso. Las tareas se ejecutan en orden
 * FIFO; como máximo `concurrency` corren a la vez.
 */
export class RequestQueue {
  private readonly concurrency: number;
  /** Tareas pendientes en orden de llegada. */
  private readonly pending: Array<() => void> = [];
  /** Cuántas tareas están ejecutándose ahora mismo. */
  private active = 0;

  constructor(concurrency = 1) {
    // Al menos 1 para no bloquear la cola por una configuración inválida.
    this.concurrency = Math.max(1, Math.floor(concurrency));
  }

  /**
   * Encola `task`. Devuelve una promesa que resuelve/rechaza con el resultado de la tarea. El
   * fallo de una tarea no afecta a las demás: la cola siempre avanza.
   */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active++;
        // Wrap en Promise.resolve para capturar tanto throws síncronos como rechazos async.
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.next();
          });
      };
      this.pending.push(run);
      this.next();
    });
  }

  /** Arranca tantas tareas pendientes como permita el límite de concurrencia. */
  private next(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const run = this.pending.shift();
      run?.();
    }
  }
}
