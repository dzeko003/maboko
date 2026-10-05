import { notFound } from "../../utils/httpError.js";

// Un technicien n'a accès qu'aux interventions qui lui sont attribuées
export const perimetre = ({ id, activiteId, role }) => ({ activiteId, ...(role === "TECHNICIEN" && { technicienId: id }) });

export async function trouverIntervention(tx, user, id) {
  const intervention = await tx.intervention.findFirst({ where: { id, ...perimetre(user) } });
  if (!intervention) throw notFound("Intervention");
  return intervention;
}
