type imageResult = {
  imageId: string;
};

export interface ImageUploadResponseData {
  result: any[];
  code: number;
  data: imageResult;
  timeUsed: number;
  pvid: string;
  requestId: string;
  success: boolean;
  mock: string[];
  sessionId: string;
  scm: string;
  version: number;
  tpp_trace: string;
}

export type ImageUploadResponse = {
  api: string;
  data: ImageUploadResponseData;
  ret: string[];
  traceId: string;
  v: string;
};
