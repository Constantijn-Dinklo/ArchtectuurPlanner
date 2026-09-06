import { UserJwtPayload } from "../middelware";
import InformationField from "../models/informationField.model";
import { IResourceField } from "../models/resources/resourceField.model";
import Table from "../models/resources/table.model";
import { ResourceType } from "../types/resource.type";


export type ResourceFieldInformation =
    | {
          fieldName: string;
      }
    | {
          informationFieldId: string;
          sourceResourceId: string;
          sourceResourceType: ResourceType;
      };

export async function getResourceField(user: UserJwtPayload, resourceFieldInformation: ResourceFieldInformation): Promise<IResourceField | undefined> {
    if("informationFieldId" in resourceFieldInformation){
        switch (resourceFieldInformation.sourceResourceType) {
            case 'table':
                const resource = await Table.findOne({
                    _id: resourceFieldInformation.sourceResourceId,
                    organisationId: user.organisationId
                });
                if(!resource) return undefined;

                const resourceField = resource.columns.find((column) => column.informationFieldId.toString() === resourceFieldInformation.informationFieldId);
                return resourceField;
        }
        return undefined;
    }
    else {
        //Create new information field since
        const newInformationField = await new InformationField({
            organisationId: user.organisationId,
            fieldName: resourceFieldInformation.fieldName
        });
        newInformationField.save();
        const resourceField: IResourceField = {
            informationFieldId: newInformationField._id,
            position: 0
        }
        return resourceField;
    }
}

export async function createInformationField(user: UserJwtPayload, fieldName: string) {
    //Create new information field since
    const newInformationField = await new InformationField({
        organisationId: user.organisationId,
        fieldName: fieldName
    });
    newInformationField.save();
    return newInformationField;
}