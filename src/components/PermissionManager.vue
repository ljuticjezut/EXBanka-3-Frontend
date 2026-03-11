<script setup lang="ts">
interface Permission {
  id: string
  name: string
  description: string
}

const props = defineProps<{
  allPermissions: Permission[]
  modelValue: string[] // selected permission names
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

function toggle(name: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(name)
  if (idx === -1) current.push(name)
  else current.splice(idx, 1)
  emit('update:modelValue', current)
}
</script>

<template>
  <div class="permissions-grid">
    <label
      v-for="perm in allPermissions"
      :key="perm.id"
      class="permission-item"
    >
      <input
        type="checkbox"
        :checked="modelValue.includes(perm.name)"
        @change="toggle(perm.name)"
      />
      <div class="perm-info">
        <div class="perm-name">{{ perm.name }}</div>
        <div class="perm-desc">{{ perm.description }}</div>
      </div>
    </label>
  </div>
</template>
