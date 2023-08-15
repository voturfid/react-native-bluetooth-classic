import React, {
  createContext,
  ReactNode,
  useContext,
  useReducer,
} from 'react';
import { IEpcProps } from '../../bluetooth/index';
import {
  ReadCommunProps,
  TypeControlTagsAnalyseProps,
} from './controlTags';

interface ReportCurrentReadTagsProviderProps {
  children: ReactNode;
}

type TagAnalyzeReportProps = {
  data?: ReadCommunProps;
  type?: TypeControlTagsAnalyseProps;
};

export type TagReportCurrentReadProps = {
  currentRead: Set<IEpcProps>;
};

interface ReportCurrentReadTagsData {
  handleAnalyzeReportCurrentReadTags: (analyze: TagAnalyzeReportProps) => void;
  currentReadTags: TagReportCurrentReadProps;
}

const ReportCurrentReadTagsContext = createContext<ReportCurrentReadTagsData>(
  {} as ReportCurrentReadTagsData
);

function ReportCurrentReadTagsProvider({
  children,
}: ReportCurrentReadTagsProviderProps) {
  const operationReport = {
    new: (
      _state: TagReportCurrentReadProps,
      tags: IEpcProps[]
    ): TagReportCurrentReadProps => {
      return { currentRead: new Set(tags) };
    },
    clear: (
      _state: TagReportCurrentReadProps,
      _tags: IEpcProps[]
    ): TagReportCurrentReadProps => {
      return { currentRead: new Set() };
    },
    default: (
      state: TagReportCurrentReadProps,
      _tags: IEpcProps[]
    ): TagReportCurrentReadProps => {
      return state;
    },
  };

  function handleAnalyze(
    state: TagReportCurrentReadProps,
    { data = { epcs: [] }, type = 'default' }: TagAnalyzeReportProps
  ) {
    return operationReport[type](state, data.epcs);
  }

  const [tagsReportCurrentRead, toAnalyze] = useReducer(handleAnalyze, {
    currentRead: new Set(),
  } as TagReportCurrentReadProps);

  function handleAnalyzeReportCurrentReadTags(analyze: TagAnalyzeReportProps) {
    toAnalyze(analyze);
  }

  return (
    <ReportCurrentReadTagsContext.Provider
      value={{
        handleAnalyzeReportCurrentReadTags,
        currentReadTags: tagsReportCurrentRead,
      }}
    >
      {children}
    </ReportCurrentReadTagsContext.Provider>
  );
}

const useReportCurrentReadTags = () => {
  const context = useContext(ReportCurrentReadTagsContext);
  return context;
};

export { ReportCurrentReadTagsProvider, useReportCurrentReadTags };
