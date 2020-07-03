export interface PollRegion {
  title: string;
  url: string;
}

export interface JobData {
  region: PollRegion;
  i: number;
}

export interface PollStats {
  ec_number: string;
  participants_number: number;
  given_bulletins_number: number;
  returned_bulletins_number: number;
  invalid_bulletins_number: number;
  yes_votes_total: string;
  yes_votes_percentage: string;
  no_votes_total: string;
  no_votes_percentage: string;
}

export interface ScraperResult {
  title: string;
  result: Record<string, PollStats>;
}