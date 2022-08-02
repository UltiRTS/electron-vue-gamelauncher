<script lang="ts">
import { defineComponent } from 'vue'
import {NSpace, NSpin} from 'naive-ui';

export default defineComponent({
    setup() {

    },
    components: {
        NSpace,
        NSpin
    }
})
</script>


<template>
    <n-space>
        <n-spin />
        Checking hash...
    </n-space>
</template>