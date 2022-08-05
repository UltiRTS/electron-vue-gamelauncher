<script lang="ts" setup>
import {send, receive, invoke} from './electron';

import {ref} from 'vue';

const installed = ref(false);
const stage = ref('install');
const downloads = ref<{
  [key:string]: number
}>({});

send('start', '');
receive('installed', (payload: any) => {
  console.log('installed', payload);
  installed.value = payload;
  if(installed.value) {
    stage.value = 'hash';
  }
});

receive('download:progress', (filename: string, offset: number) => {
  downloads.value[filename] = offset;
  stage.value = 'download';
})
receive('download:error', (filename: string) => {
  console.log('download:error', filename);
});
receive('download:complete', (filename: string) => {
  console.log('download:complete', filename);
});

receive('extract:done', (filename: string, verified: boolean) => {
  console.log(`extract:done ${filename} ${verified}`);
});
receive('update-lobby:done', () => {
  console.log('update-lobby:done');
})
</script>

<script lang="ts">
import { defineComponent } from 'vue'
import HashChecking from './components/HashChecking.vue';
import DownloadProgress from './components/DownloadProgress.vue';

export default defineComponent({
  components: {
    HashChecking,
    DownloadProgress
  },
})
</script>


<template>
  <div id="app">
    <div>{{stage}}</div>
    <div v-if="stage==='install'">
      Not installed yet, find a folder to install 
      <button @click="invoke('dialog:openDirectory', '')">Open</button>
    </div>
    <div v-else>
      <HashChecking />
      <div class="downloads">
        <div v-for="[filename, offset] in Object.entries(downloads)" :key="filename">
          <DownloadProgress :filename="filename" :offset="offset" />
        </div>
      </div>
    </div>
  </div>
</template>
