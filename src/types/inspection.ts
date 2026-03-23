// TypeScript 类型定义，参考 docs/data-structre.txt 建议

export type BaseOptionItem = {
  id: string;
  label: string;
};

export type ResultOptionItem = {
  value: string;
  label: string;
};

export type Worker = {
  id: string;
  name: string;
  employeeNo: string;
  enabled: boolean;
  defaultLineId?: string;
  defaultShiftId?: string;
  tags?: string[];
};

export type TemplateItem = {
  id: string;
  label: string;
  type: 'radio' | 'number' | 'text' | 'textarea';
  required: boolean;
  optionSetId?: string;
  defaultValue?: string | number;
  allowRemark?: boolean;
  remarkRequiredWhen?: {
    operator: 'equals';
    value: string | number;
  };
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  sortOrder: number;
};

export type TemplateSection = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  items: TemplateItem[];
};

export type InspectionTemplate = {
  id: string;
  name: string;
  enabled: boolean;
  applicableLineIds: string[];
  sections: TemplateSection[];
};

export type AppInfo = {
  appName: string;
  version: string;
  factoryName: string;
  defaultTemplateId: string;
  recordRetentionDays: number;
  autoSaveIntervalMs: number;
  enableDraftAutoSave: boolean;
  allowEditSubmittedRecord: boolean;
  maxSelectableRecordsForPdf: number;
};

export type BaseOptions = {
  shifts: BaseOptionItem[];
  productionLines: BaseOptionItem[];
  workshops: BaseOptionItem[];
  inspectionAreas: BaseOptionItem[];
};

export type ResultOptionSets = Record<string, ResultOptionItem[]>;

export type PdfConfig = {
  title: string;
  subTitle: string;
  fileNamePattern: string;
  showFactoryName: boolean;
  showExportTime: boolean;
  showWorkerInfo: boolean;
  showSectionTitle: boolean;
  paperSize: string;
  orientation: string;
};

export type InspectionConfig = {
  appInfo: AppInfo;
  baseOptions: BaseOptions;
  workers: Worker[];
  resultOptionSets: ResultOptionSets;
  templates: InspectionTemplate[];
  pdfConfig: PdfConfig;
};

export type AnswerValue = string | number | null;

export type InspectionAnswer = {
  value: AnswerValue;
  remark: string;
  filled: boolean;
  abnormal: boolean;
  updatedAt?: string;
};

export type InspectionRecord = {
  id: string;
  templateId: string;
  templateName: string;
  workerId: string;
  workerName: string;
  employeeNo: string;
  shiftId: string;
  shiftName: string;
  productionLineId: string;
  productionLineName: string;
  workshopId?: string;
  workshopName?: string;
  inspectionAreaId?: string;
  inspectionAreaName?: string;
  inspectionDate: string;
  status: 'draft' | 'submitted';
  answers: Record<string, InspectionAnswer>;
  overallRemark?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  exported: boolean;
  exportedAt?: string | null;
};
