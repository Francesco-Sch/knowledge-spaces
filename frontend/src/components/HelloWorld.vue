<script setup>
import { onBeforeMount } from 'vue'

let msg = ''
const getMessage = () => {
  fetch('http://localhost:7100/')
    .then((res) => {
      msg = res.data;
    })
    .catch((error) => {
      console.error(error);
    });
}

onBeforeMount(() => {
  getMessage()
  console.log(msg)
})
</script>

<template>
  <div>
    <p>{{ msg }}</p>
  </div>
</template>
