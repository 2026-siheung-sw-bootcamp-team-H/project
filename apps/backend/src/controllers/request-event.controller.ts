import type { RequestHandler } from "express";
import {
  getRequestEvent,
  listRequestEvents,
  renormalizeRequestEvent
} from "../services/request-event.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const listEvents: RequestHandler = async (request, response) => {
  const events = await listRequestEvents(request.query);
  response.json(createSuccessResponse(events));
};

export const getEvent: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getRequestEvent(String(request.params.id))));
};

export const normalizeEvent: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await renormalizeRequestEvent(String(request.params.id))));
};
