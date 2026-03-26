import { ref, computed, type Ref } from 'vue'

export function useCrudDrawer<T extends { id: string }>(items: Ref<T[]>) {
  const drawerOpen = ref(false)
  const editingId = ref<string | null>(null)

  const editingItem = computed(() =>
    editingId.value ? items.value.find((item) => item.id === editingId.value) : undefined,
  )

  function openNew() {
    editingId.value = null
    drawerOpen.value = true
  }

  function openEdit(id: string) {
    editingId.value = id
    drawerOpen.value = true
  }

  function close() {
    drawerOpen.value = false
    editingId.value = null
  }

  return { drawerOpen, editingId, editingItem, openNew, openEdit, close }
}
