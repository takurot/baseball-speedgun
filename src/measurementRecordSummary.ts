import {
  MEASUREMENT_TYPES,
  MeasurementType,
  getMeasurement,
} from './measurements';

type RecordDoc = {
  data: () => Record<string, unknown>;
};

export type MeasurementRecordSummary = {
  speed: number;
  updatedAt: Date;
};

type RetentionPatchOptions = {
  playerName: string;
  playerData: Record<string, unknown> | null;
  activeMeasurement: MeasurementType;
  otherRecordSummaries: Partial<
    Record<MeasurementType, MeasurementRecordSummary | null>
  >;
  deleteFieldValue: unknown;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
};

export const summarizeMeasurementRecords = (
  docs: RecordDoc[]
): MeasurementRecordSummary | null => {
  let maxSpeed: number | null = null;
  let latestDate: Date | null = null;

  docs.forEach((docSnap) => {
    const data = docSnap.data();
    const speed = data.speed;
    const date = toDate(data.date);
    if (typeof speed !== 'number' || !date) {
      return;
    }
    maxSpeed = maxSpeed === null ? speed : Math.max(maxSpeed, speed);
    latestDate =
      !latestDate || date.getTime() > latestDate.getTime() ? date : latestDate;
  });

  return maxSpeed === null || latestDate === null
    ? null
    : { speed: maxSpeed, updatedAt: latestDate };
};

export const buildPlayerRetentionPatch = ({
  playerName,
  playerData,
  activeMeasurement,
  otherRecordSummaries,
  deleteFieldValue,
}: RetentionPatchOptions): Record<string, unknown> | null => {
  const active = getMeasurement(activeMeasurement);
  const patch: Record<string, unknown> = {
    name: typeof playerData?.name === 'string' ? playerData.name : playerName,
    [active.valueField]: deleteFieldValue,
    [active.updatedAtField]: deleteFieldValue,
  };
  let shouldRetainPlayer = false;

  MEASUREMENT_TYPES.forEach((type) => {
    if (type === activeMeasurement) return;

    const measurement = getMeasurement(type);
    const recordSummary = otherRecordSummaries[type];
    const hasExistingSummary =
      typeof playerData?.[measurement.valueField] === 'number';
    if (hasExistingSummary) {
      shouldRetainPlayer = true;
      if (!toDate(playerData?.[measurement.updatedAtField]) && recordSummary) {
        patch[measurement.updatedAtField] = recordSummary.updatedAt;
      }
      return;
    }

    if (!recordSummary) return;

    shouldRetainPlayer = true;
    patch[measurement.valueField] = recordSummary.speed;
    patch[measurement.updatedAtField] = recordSummary.updatedAt;
  });

  return shouldRetainPlayer ? patch : null;
};
