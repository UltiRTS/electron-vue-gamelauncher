<script lang="ts">
import { defineComponent } from 'vue'
import {NSpace} from 'naive-ui'

export default defineComponent({
    components: {
        NSpace
    },
    props: {
        offset: {
            type: Number,
            default: 0
        },
        filename: {
            type: String,
            default: ''
        },
    }
})
</script>


<template>
    <n-space> {{filename}} - {{offset}} </n-space>
</template>