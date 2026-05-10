export type MeasurementType = 'pitch' | 'swing';

export type MeasurementConfig = {
  type: MeasurementType;
  label: string;
  valueField: 'speed' | 'swingSpeed';
  updatedAtField: 'updatedAt' | 'swingUpdatedAt';
  recordsCollection: 'records' | 'swingRecords';
};

export const MEASUREMENTS: Record<MeasurementType, MeasurementConfig> = {
  pitch: {
    type: 'pitch',
    label: '球速',
    valueField: 'speed',
    updatedAtField: 'updatedAt',
    recordsCollection: 'records',
  },
  swing: {
    type: 'swing',
    label: 'スイングスピード',
    valueField: 'swingSpeed',
    updatedAtField: 'swingUpdatedAt',
    recordsCollection: 'swingRecords',
  },
};

export const MEASUREMENT_TYPES = Object.keys(MEASUREMENTS) as MeasurementType[];

export const isMeasurementType = (value: string | undefined): value is MeasurementType =>
  value === 'pitch' || value === 'swing';

export const getMeasurement = (type: MeasurementType) => MEASUREMENTS[type];
