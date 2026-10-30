import { useInformationRelationStore } from "../stores/information/informationRelation.store";
import { useExternalService } from "./resources/external.service";

// The relations of external elements, and what they receive, follow from the connections and apis to and from them.
// The backend keeps them up to date, so reload them after such a change
export async function refreshReceivedInformation() {
    await Promise.all([
        useExternalService().fetchExternals(),
        useInformationRelationStore().fetchInformationRelations()
    ]);
}
