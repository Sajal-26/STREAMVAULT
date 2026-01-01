
export interface SkipInterval {
  start: number;
  end: number;
  type: 'intro' | 'outro';
}

export const skipService = {
  getSkipIntervals: async (
    type: string, 
    id: string, 
    season?: number, 
    episode?: number
  ): Promise<SkipInterval[]> => {
    // In a real application, this would fetch from a database or API
    // For now, we return an empty array or mock data
    // Example: if (id === '123') return [{ start: 0, end: 90, type: 'intro' }];
    return [];
  }
};
