import { handleHandbookProgressDelete, handleHandbookProgressGet, handleHandbookProgressPut } from "../../handbook-progress-handlers";
import { handbookProgressRepository } from "../../handbook-progress-repository";

export function GET(request: Request) {
  return handleHandbookProgressGet(request, handbookProgressRepository);
}

export function PUT(request: Request) {
  return handleHandbookProgressPut(request, handbookProgressRepository);
}

export function DELETE(request: Request) {
  return handleHandbookProgressDelete(request, handbookProgressRepository);
}
