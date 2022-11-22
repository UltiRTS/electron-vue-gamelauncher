<script lang="ts" setup>
import {send, receive, invoke} from './electron';

import {onMounted, ref} from 'vue';

const updateStatus = ref({
  lobby: {
    status: false,
    msg: ''
  },
  mods: {
    status: false,
    msg: ''
  },
  engine: {
    status: false,
    msg: ''
  } 
})

const installed = ref(false);
const firstTime = ref(true);
const stage = ref('install');
const downloads = ref<{
  [key:string]: number
}>({});

const updateAll = async () => {
  stage.value = 'udpate';

  let res;
  res = await invoke('update-lobby', '');
  if(res.status) {
    updateStatus.value.lobby.status = true;
  } else {
    updateStatus.value.lobby.msg = res.msg;
  }
  res = await invoke('update-mods', '');
  if(res.status) {
    updateStatus.value.mods.status = true;
  } else {
    updateStatus.value.mods.msg = res.msg;
  }
  res = await invoke('update-engine', '');
  if(res.status) {
    updateStatus.value.engine.status = true;
  } else {
    updateStatus.value.engine.msg = res.msg;
  }

  if(updateStatus.value.engine.status && updateStatus.value.lobby.status && updateStatus.value.mods.status) {
    // if(firstTime) {
    //   await invoke('heat-engine', '');
    // } else await invoke('launch', '');
    invoke('launch', '');
  }
}

receive('start', async () => {
  await updateAll();
})

receive('download:progress', (filename: string, offset: number) => {
  downloads.value[filename] = offset;
  stage.value = 'download';
})

onMounted(async () => {
  const installed = await invoke('installed', '');
  if(installed) {
    firstTime.value = false;
    stage.value = 'update';
    updateAll();
  }
})

</script>

<script lang="ts">
import { defineComponent } from 'vue'
import HashChecking from './components/HashChecking.vue';
import DownloadProgress from './components/DownloadProgress.vue';
import { update } from 'lodash';

export default defineComponent({
  components: {
    HashChecking,
    DownloadProgress
  },
})
</script>


<template>
  <div id="app">
    <button @click="invoke('clear-cache', [])">clear cache & quit</button>
    <div>{{stage}}</div>
    <div v-if="stage==='install'">
      Not installed yet, find a folder to install 
      <button @click="invoke('dialog:openDirectory', '')">Open</button>
    </div>
    <div v-else>
      <!-- <HashChecking /> -->
      <div class="downloads">
        <div v-for="[filename, offset] in Object.entries(downloads)" :key="filename">
          <DownloadProgress :filename="filename" :offset="offset" />
        </div>
      </div>
      <div class="status">
        <div v-for="[name, info] in Object.entries(updateStatus)" :key="name">
          <div>{{name}}</div>
          <div>{{info.status}}</div>
          <div>{{info.msg}}</div>
        </div>
      </div>
    </div>
  </div>
</template>
