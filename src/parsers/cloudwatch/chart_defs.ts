/**
 * This file is here to allow IDE auto-complete for object definitions.
 * It is not meant to be compiled.
 */
import { CloudWatch } from "aws-sdk";

export interface ChartConfig {
	metrics: ChartMetricConfig[];

	width: number;
	height: number;
	timeOffset: number;
	timePeriod: number;
	chartSamples?: number;
}

export interface ChartMetricConfig {
	title: string;
	color?: string;
	thickness?: number;
	dashed?: boolean|string;
	query: CloudWatch.Types.GetMetricStatisticsInput;
	threshold?: number;
}
