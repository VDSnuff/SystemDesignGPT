import { handleLearningStateDelete, handleLearningStateGet, handleLearningStatePut } from "../../learning-state-handlers";
import { learningStateRepository } from "../../learning-state-repository";

export function GET(request: Request) {
  return handleLearningStateGet(request, learningStateRepository);
}

export function PUT(request: Request) {
  return handleLearningStatePut(request, learningStateRepository);
}

export function DELETE(request: Request) {
  return handleLearningStateDelete(request, learningStateRepository);
}
