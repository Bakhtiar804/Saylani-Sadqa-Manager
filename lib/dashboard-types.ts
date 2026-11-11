export type RecordValue = string | number | boolean | null | undefined;
export type DataRecord = Record<string, RecordValue>;

export type CityOption = {
  city_id: string;
  city_name: string;
  province: string;
};

export type RecordColumn = {
  key: string;
  label: string;
};

export type ChartDatum = {
  [key: string]: string | number | null | undefined;
  name?: string;
  label?: string;
  month?: string;
  value?: number | null;
  collection?: number;
  collections?: number;
  color?: string;
};

export type MetricTone = "green" | "blue" | "orange" | "purple" | "red";
