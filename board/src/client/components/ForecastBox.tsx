import type { Forecast } from '../../shared/model.js';
import { num, one } from '../format.js';

type Props = { f: Forecast; paceDays: number; minClosures: number; ready: number };

export function ForecastBox({ f, paceDays, minClosures, ready }: Props) {
  return (
    <div className="wb-forecast">
      {f.kind === 'cut' && <span className="wb-muted">Data cut at the page limit, no forecast</span>}
      {f.kind === 'few' && <span className="wb-muted">No forecast: fewer than {minClosures} closed issues in {paceDays} days</span>}
      {f.kind === 'ok' && (
        <>
          <span>Own work at current pace: <b>~{one.format(f.weeks)} weeks</b></span>
          <span className="wb-muted">{num.format(f.queue)} open issues, {one.format(f.perWeek)} closed per week</span>
        </>
      )}
      {ready > 0 && <span>{ready} {ready === 1 ? 'issue could' : 'issues could'} go to the agent</span>}
    </div>
  );
}
