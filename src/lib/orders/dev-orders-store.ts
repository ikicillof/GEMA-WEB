import { createInMemoryOrdersRepository } from '@/lib/orders'

// Instancia única en memoria, compartida por todo el proceso del servidor —
// a diferencia de llamar createInMemoryOrdersRepository() en cada request
// (que crea un Map nuevo y descartable cada vez), esto persiste mientras
// el proceso viva, para que el checkout y el webhook vean los mismos
// pedidos sin necesitar un proyecto Supabase real conectado todavía.
export let devOrdersRepository = createInMemoryOrdersRepository()

// Solo para tests: reinicia el singleton para que los distintos archivos de
// test (que comparten este módulo dentro del mismo worker de Vitest) no se
// contaminen entre sí con pedidos creados por otros archivos.
export function __resetDevOrdersRepositoryForTests(): void {
  devOrdersRepository = createInMemoryOrdersRepository()
}
