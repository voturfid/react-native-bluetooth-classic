import React, {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from 'react';
import { TypeControlTagsAnalyseProps } from './controlTags';

interface ReportCurrentWriteTagProviderProps {
  children: ReactNode;
}

export type WrittenProps = {
  epcRead: string;
  epcWritten: string;
  error?: string;
};

type TagAnalyzeReportProps = {
  data?: WrittenProps;
  type?: TypeControlTagsAnalyseProps;
};

export type TagReportCurrentWriteProps = {
  currentWrite: WrittenProps;
};

interface ReportCurrentWriteTagData {
  handleAnalyzeReportCurrentWriteTag: (analyze: TagAnalyzeReportProps) => void;
  currentWriteTag: TagReportCurrentWriteProps;
}

const ReportCurrentWriteTagContext = createContext<ReportCurrentWriteTagData>(
  {} as ReportCurrentWriteTagData
);

function ReportCurrentWriteTagsProvider({
  children,
}: ReportCurrentWriteTagProviderProps) {
  const operationReport = {
    new: (
      _: TagReportCurrentWriteProps,
      written?: WrittenProps
    ): TagReportCurrentWriteProps => {
      if (written) {
        return { currentWrite: written };
      }
      return {} as TagReportCurrentWriteProps;
    },
    clear: (
      _state: TagReportCurrentWriteProps,
      _?: WrittenProps
    ): TagReportCurrentWriteProps => {
      return {} as TagReportCurrentWriteProps;
    },
    default: (
      state: TagReportCurrentWriteProps,
      _?: WrittenProps
    ): TagReportCurrentWriteProps => {
      return state;
    },
  };

  function handleAnalyze(
    state: TagReportCurrentWriteProps,
    { data, type = 'default' }: TagAnalyzeReportProps
  ) {
    return operationReport[type](state, data);
  }

  const [tagReportCurrentWrite, toAnalyze] = useReducer(
    handleAnalyze,
    {} as TagReportCurrentWriteProps
  );

  function handleAnalyzeReportCurrentWriteTag(analyze: TagAnalyzeReportProps) {
    toAnalyze(analyze);
  }

  return (
    <ReportCurrentWriteTagContext.Provider
      value={{
        handleAnalyzeReportCurrentWriteTag,
        currentWriteTag: tagReportCurrentWrite,
      }}
    >
      {children}
    </ReportCurrentWriteTagContext.Provider>
  );
}

const useReportCurrentWriteTag = () => {
  const context = useContext(ReportCurrentWriteTagContext);
  return context;
};

export { ReportCurrentWriteTagsProvider, useReportCurrentWriteTag };
