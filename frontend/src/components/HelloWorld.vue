<script lang="ts" setup>
import { useFetch } from '../composables/fetch'

const { data, error } = useFetch('http://localhost:7100/')
</script>

<template>
  <div>
    <p>{{ data }}</p>
  </div>
</template>
