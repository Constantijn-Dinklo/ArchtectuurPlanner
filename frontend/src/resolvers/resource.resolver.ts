import type { ResolvedResource, Resource } from "../services/resources/resource.service";
import { useInformationFieldStore } from "../stores/information/informationField.store";
import { useInformationObjectStore } from "../stores/information/informationObject.store";
import type { Application, ResolvedApplication } from "../types/application.types";
import type { External, ResolvedExternal } from "../types/external.types";
import type { InformationFieldReference, ResolvedInformationFieldReference } from "../types/informationField.type";
import type { InformationObject, InformationObjectReference, ResolvedInformationObject, ResolvedInformationObjectReference } from "../types/informationObject.type";


export function useResourceResolver() {
    const informationFieldStore = useInformationFieldStore();
    const informationObjectStore = useInformationObjectStore();

    function resolveResource(resource: Resource): ResolvedResource {
        // if(resource.name !== 'App 5') { return resource; }
        switch (resource.type) {
            case 'application':
                return resolveApplication(resource);

            case 'external':
                return resolveExternal(resource);

            case 'database':
                return resource;

            case 'fileLocation':
                return resource;

            default:
                return resource;
        }
    }
    
    
    function resolveApplication(
        application: Application
    ): ResolvedApplication {
        // console.log(application);
        return {
            ...application,

            inputInformationFields:
                application.inputInformationFieldRefs
                    .map(informationFieldRef =>
                        resolveInformationFieldRef(informationFieldRef)
                    ),

            outputInformationFields:
                application.outputInformationFieldRefs
                    .map(informationFieldRef =>
                        resolveInformationFieldRef(informationFieldRef)
                    ),

            inputInformationObjects:
                application.inputInformationObjectRefs
                    .map(informationObject =>
                        resolveInformationObjectRef(informationObject)
                    ),

            outputInformationObjects:
                application.outputInformationObjectRefs
                    .map(informationObject =>
                        resolveInformationObjectRef(informationObject)
                    )
        };
    }

    function resolveExternal(external: External): ResolvedExternal {
        return {
            ...external,

            providedInformationFields: external.providedInformationFieldRefs.map(resolveInformationFieldRef),
            providedInformationObjects: external.providedInformationObjectRefs.map(resolveInformationObjectRef),
            receivedInformationFields: external.receivedInformationFieldRefs.map(resolveInformationFieldRef),
            receivedInformationObjects: external.receivedInformationObjectRefs.map(resolveInformationObjectRef)
        };
    }

    function resolveInformationFieldRef(
        informationFieldRef: InformationFieldReference
    ): ResolvedInformationFieldReference {
        // console.log(informationFieldRef);
        const informationField =
            informationFieldStore.getInformationField(
                informationFieldRef.informationFieldId
            );

        if (!informationField) {
            throw new Error(
                `InformationField ${informationFieldRef.informationFieldId} not found`
            );
        }

        return {
            informationField,
            position: informationFieldRef.position
        };
    }

    function resolveInformationObject(
        informationObject: InformationObject
    ): ResolvedInformationObject {
        return {
            ...informationObject,

            informationFields:
                informationObject.informationFieldIds.map(
                    informationFieldId =>
                        informationFieldStore.getInformationField(informationFieldId)
                ).filter(informationField => informationField !== undefined)
        };
    }

    function resolveInformationObjectRef(
        informationObjectRef: InformationObjectReference
    ): ResolvedInformationObjectReference {
        const informationObject =
            informationObjectStore.getInformationObject(
                informationObjectRef.informationObjectId
            );

        if (!informationObject) {
            throw new Error(
                `InformationObject ${informationObjectRef.informationObjectId} not found`
            );
        }

        return {
            informationObject: resolveInformationObject(informationObject),
            position: informationObjectRef.position
        };
    }

    return {
        resolveResource
    };
}