import { create } from "zustand"

export const useAvisosStore = create((set, get) => ({

  // Set actual (grupo de avisos)
  currentSet: null,

  // Avisos del set actual
  avisos: [],
  selectedAvisoId: null,
  dirty: false,
  isSaving: false,
  // Global flag to avoid concurrent publish processes across UI
  isPublishing: false,

  // Carga inicial desde el backend (modo legacy: sólo array de avisos)
  initializeAvisos: (data) =>
    set({
      avisos: data,
      dirty: false,
      selectedAvisoId: data?.[0]?.id ?? null,
    }),

  // Cargar desde payload completo del backend { avisos, set }
  initializeFromServer: (payload) => {
    const avisos = payload?.avisos || []
    const setInfo = payload?.set || null

    set({
      currentSet: setInfo,
      avisos,
      dirty: false,
      selectedAvisoId: avisos[0]?.id ?? null,
    })
  },

  // Actualizar sólo los metadatos del set actual (código, fecha, título, etc.)
  updateCurrentSetMeta: (partial) =>
    set((state) => ({
      currentSet: state.currentSet
        ? { ...state.currentSet, ...partial }
        : { ...partial },
      dirty: true,
    })),

  // Mutación local de avisos (marca dirty)
  setAvisos: (data) =>
    set({
      avisos: data,
      dirty: true,
    }),

  updateAviso: (id, newData) =>
    set((state) => {

      const nuevosAvisos = state.avisos.map((aviso) => {

        if (aviso.id === id) {
          return {
            ...aviso,
            ...newData,
          }
        }

        return aviso

      })

      return {
        avisos: nuevosAvisos,
        dirty: true,
      }

    }),

  setSelectedAvisoId: (id) => set({ selectedAvisoId: id }),

  clearCurrentSet: () => set({ currentSet: null }),

  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),

  setSaving: (isSaving) => set({ isSaving }),
  setPublishing: (isPublishing) => set({ isPublishing }),
  // Global notifications (simple queue)
  notifications: [],
  addNotification: (note) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8)
    const n = { id, type: note.type || 'info', text: note.text || '', timeout: note.timeout || 4000 }
    set((state) => ({ notifications: [...state.notifications, n] }))
    if (n.timeout && n.timeout > 0) {
      setTimeout(() => {
        set((state) => ({ notifications: state.notifications.filter((x) => x.id !== id) }))
      }, n.timeout)
    }
    return id
  },
  removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter((x) => x.id !== id) })),
  // Global modal (simple single modal host)
  modal: null,
  showModal: (modal) => set({ modal }),
  hideModal: () => set({ modal: null }),

}))