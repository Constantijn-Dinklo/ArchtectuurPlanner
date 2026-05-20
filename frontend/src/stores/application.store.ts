import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Application {
    id: string;
    name: string;
}

export const useApplicationStore = defineStore('application', () => {
    const applications = ref<Application[]>([]);

    function addApplication(name: string) {
        const newApplication : Application = {
            id: crypto.randomUUID(),
            name: name
        }

        applications.value.push(newApplication);
    }

    function removeApplication(id: string){
        applications.value = applications.value.filter((application) => application.id != id);
    }

    return { applications, addApplication, removeApplication }
})