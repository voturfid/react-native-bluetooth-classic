import React, {
  useCallback,
  createContext,
  ReactNode,
  useContext,
  useRef,
  MutableRefObject,
} from 'react';
import { IEpcProps } from '../../bluetooth/index';
import {
  TagReportAccumulatedProps,
  useReportAccumulatedTags,
} from './reportAccumulatedTags';
import {
  BarcodeProps,
  ReportCurrentBarcodeProps,
  useReportCurrentReadBarcode,
} from './reportCurrentBarcode';
import {
  TagReportCurrentReadProps,
  useReportCurrentReadTags,
} from './reportCurrentReadTags';
import {
  TagReportCurrentWriteProps,
  useReportCurrentWriteTag,
  WrittenProps,
} from './reportCurrentWriteTag';
import {
  ReadForRecorderProps,
  TagReportReadForRecorderProps,
  useReportReadForRecorderTag,
} from './reportReadForRecorderTag';

interface ControlTagsProviderProps {
  children: ReactNode;
}

export type ReadCommunProps = {
  epcs: IEpcProps[];
};

export type TypeControlTagsAnalyseProps = 'new' | 'clear' | 'default';

type ControlTagsAnalyse = {
  data: IEpcProps[] | BarcodeProps | WrittenProps | ReadForRecorderProps;
  type?: TypeControlTagsAnalyseProps;
};

export type ReadModeReport =
  | 'standby'
  | 'accumulated'
  | 'current'
  | 'write'
  | 'readForRecorder'
  | 'barcode';

export interface ControlTagsData {
  readModeReport: MutableRefObject<ReadModeReport>;
  tagsAccumulated: TagReportAccumulatedProps;
  tagsCurrent: TagReportCurrentReadProps;
  tagWritten: TagReportCurrentWriteProps;
  readForRecorder: TagReportReadForRecorderProps;
  barcodeCurrent: ReportCurrentBarcodeProps;
  handleControlTags: (controlTagsAnalyse: ControlTagsAnalyse) => void;
  handleControlClear: () => Promise<void>;
}

const ControlTagsContext = createContext<ControlTagsData>(
  {} as ControlTagsData
);

function ControlTagsProvider({ children }: ControlTagsProviderProps) {
  const { handleAnalyzeReportAccumulatedTags, accumulatedTags } =
    useReportAccumulatedTags();

  const { handleAnalyzeReportCurrentReadTags, currentReadTags } =
    useReportCurrentReadTags();

  const { handleAnalyzeReportCurrentReadBarcode, currentReadBarcode } =
    useReportCurrentReadBarcode();

  const { handleAnalyzeReportCurrentWriteTag, currentWriteTag } =
    useReportCurrentWriteTag();

  const { handleAnalyzeReportReadForRecorderTag, currentReadForRecorderTags } =
    useReportReadForRecorderTag();

  const readModeReport = useRef<ReadModeReport>('standby');

  const handleControlClear = useCallback(async () => {
    const compute = {
      accumulated: () => handleAnalyzeReportAccumulatedTags({ type: 'clear' }),
      current: () => handleAnalyzeReportCurrentReadTags({ type: 'clear' }),
      write: () => {
        handleAnalyzeReportCurrentWriteTag({ type: 'clear' });
      },
      barcode: () => {
        handleAnalyzeReportCurrentReadBarcode({ type: 'clear' });
      },
      readForRecorder: () => {
        handleAnalyzeReportReadForRecorderTag({ type: 'clear' });
      },
      // eslint-disable-next-line prettier/prettier
      standby: () => { },
    };

    compute[readModeReport.current]();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleControlTags = useCallback(
    ({ data, type }: ControlTagsAnalyse) => {
      // console.log('handleTagRender, modo:', readModeReport.current);

      const compute = {
        accumulated: () =>
          handleAnalyzeReportAccumulatedTags({
            data: data as ReadCommunProps,
            type,
          }),
        current: () =>
          handleAnalyzeReportCurrentReadTags({
            data: data as ReadCommunProps,
            type,
          }),
        write: () =>
          handleAnalyzeReportCurrentWriteTag({
            data: data as WrittenProps,
            type,
          }),
        barcode: () =>
          handleAnalyzeReportCurrentReadBarcode({
            data: data as BarcodeProps,
            type,
          }),
        readForRecorder: () => {
          handleAnalyzeReportReadForRecorderTag({
            data: data as ReadForRecorderProps,
            type,
          });
        },
        // eslint-disable-next-line prettier/prettier
        standby: () => { },
      };

      compute[readModeReport.current]();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <ControlTagsContext.Provider
      value={{
        readModeReport,
        tagsAccumulated: accumulatedTags,
        tagsCurrent: currentReadTags,
        readForRecorder: currentReadForRecorderTags,
        tagWritten: currentWriteTag,
        barcodeCurrent: currentReadBarcode,
        handleControlTags,
        handleControlClear,
      }}
    >
      {children}
    </ControlTagsContext.Provider>
  );
}

const useControlTags = () => {
  const context = useContext(ControlTagsContext);
  return context;
};

export { ControlTagsProvider, useControlTags };
