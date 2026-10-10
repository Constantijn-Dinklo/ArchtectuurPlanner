import type { Application, ApplicationDto } from "../types/application.types";

export function mapApplicationDto(
    application: ApplicationDto
): Application {
    return {
        id: application.id,
        type: 'application',
        name: application.name,
        version: application.version,
        developer: application.developer ?? '',
        hosting: application.hosting ?? 'unknown',
        websiteUrl: application.websiteUrl ?? '',

        inputInformationFieldRefs:
            application.inputInformationFields,

        outputInformationFieldRefs:
            application.outputInformationFields,

        inputInformationObjectRefs:
            application.inputInformationObjects,

        outputInformationObjectRefs:
            application.outputInformationObjects
    };
}