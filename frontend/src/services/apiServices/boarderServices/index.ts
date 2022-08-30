import { ApiService, ListResponse } from '..';
import { Data } from '../api';

export type BoarderTime = {
  name: string,
  time: string,
  date: string,
  _id: string,
  __v: string,
};

export type TimeData = {
  name: string,
  time: string,
  date: string,
};

interface ITimeService {
  createTimeData:(data: TimeData) => Promise<TimeData>;
  getTimesData:() => Promise<ListResponse<BoarderTime>>;
  getTimeData:(id: number) => Promise<BoarderTime | undefined>;
  deleteTimeData:(id: number) => Promise<boolean | Response>;
  updateTimeData:(id: number, data: TimeData) => Promise<BoarderTime | undefined>;
}

class TimeServices extends ApiService implements ITimeService {
  public async createTimeData(data: TimeData):Promise<TimeData> {
    return (await super.create<TimeData>(data)) as TimeData;
  }

  public async getTimesData():Promise<ListResponse<BoarderTime>> {
    const query: Data = {};
    return super.getAll<BoarderTime>(query);
  }

  public async getTimeData(id: number):Promise<BoarderTime | undefined> {
    return super.getId<BoarderTime>(id);
  }

  public async deleteTimeData(id: number):Promise<boolean | Response> {
    return super.delete(id);
  }

  public async updateTimeData(id: number, data: TimeData):Promise<BoarderTime | undefined> {
    return super.update<BoarderTime>(id, data);
  }
}

export { ITimeService, TimeServices };