-- Migration séparée : Postgres n'autorise pas l'usage d'une nouvelle valeur d'enum dans la transaction qui l'ajoute
ALTER TYPE "TypeReference" ADD VALUE 'RECU';
