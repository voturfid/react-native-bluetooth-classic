import React, {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from 'react';
import { IEpcProps } from '../../bluetooth/index';
import { TypeControlTagsAnalyseProps } from './controlTags';

interface ReportReadForRecorderTagProviderProps {
  children: ReactNode;
}

export type ReadForRecorderProps = {
  epcs: IEpcProps[];
  error?: string;
};

type TagAnalyzeReportProps = {
  data?: ReadForRecorderProps;
  type?: TypeControlTagsAnalyseProps;
};

export type TagReportReadForRecorderProps = {
  currentRead: ReadForRecorderProps;
};

interface ReportReadForRecorderTagData {
  handleAnalyzeReportReadForRecorderTag: (
    analyze: TagAnalyzeReportProps
  ) => void;
  currentReadForRecorderTags: TagReportReadForRecorderProps;
}

const ReportReadForRecorderTagContext =
  createContext<ReportReadForRecorderTagData>(
    {} as ReportReadForRecorderTagData
  );

function ReportReadForRecorderTagsProvider({
  children,
}: ReportReadForRecorderTagProviderProps) {
  const operationReport = {
    new: (
      _: TagReportReadForRecorderProps,
      read?: ReadForRecorderProps
    ): TagReportReadForRecorderProps => {
      if (read) {
        return { currentRead: read };
      }
      return {} as TagReportReadForRecorderProps;
    },
    clear: (
      _state: TagReportReadForRecorderProps,
      _?: ReadForRecorderProps
    ): TagReportReadForRecorderProps => {
      return {} as TagReportReadForRecorderProps;
    },
    default: (
      state: TagReportReadForRecorderProps,
      _?: ReadForRecorderProps
    ): TagReportReadForRecorderProps => {
      return state;
    },
  };

  function handleAnalyze(
    state: TagReportReadForRecorderProps,
    { data, type = 'default' }: TagAnalyzeReportProps
  ) {
    return operationReport[type](state, data);
  }

  const [tagReportReadForRecorder, toAnalyze] = useReducer(
    handleAnalyze,
    {} as TagReportReadForRecorderProps
  );

  function handleAnalyzeReportReadForRecorderTag(
    analyze: TagAnalyzeReportProps
  ) {
    toAnalyze(analyze);
  }

  return (
    <ReportReadForRecorderTagContext.Provider
      value={{
        handleAnalyzeReportReadForRecorderTag,
        currentReadForRecorderTags: tagReportReadForRecorder,
      }}
    >
      {children}
    </ReportReadForRecorderTagContext.Provider>
  );
}

const useReportReadForRecorderTag = () => {
  const context = useContext(ReportReadForRecorderTagContext);
  return context;
};

export { ReportReadForRecorderTagsProvider, useReportReadForRecorderTag };
