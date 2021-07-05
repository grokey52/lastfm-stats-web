import * as Highcharts from 'highcharts';
import {TempStats, Constants} from '../model';
import {AbstractChart} from './abstract-chart';
import heatmap from 'highcharts/modules/heatmap';
heatmap(Highcharts);

export class PunchcardChart extends AbstractChart {
  private yearLabel?: Highcharts.SVGElement;
  private prevButton?: Highcharts.SVGElement;
  private nextButton?: Highcharts.SVGElement;

  options: Highcharts.Options = {
    series: [{
      name: 'Scrobbles',
      type: 'heatmap',
      data: [],
      borderWidth: 1,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '10px'
        }
      },
      custom: {
        component: this,
        data: undefined,
        year: 0,
        first: 0,
        last: 0,
        byUser: false,
      }
    }],
    title: {
      text: 'Number of scrobbles'
    },
    tooltip: {
      formatter(): string {
        const year = this.series.options.custom!.year;
        const week = this.point.x;
        const fdoy = new Date(year, 0, 1).getDay();
        const days = (1 + (week - 1) * 7) + this.point.y! + (7 - fdoy);
        const date = new Date(year, 0, days);
        return `${date.toLocaleDateString()}: <b>${this.point.value} scrobbles</b>`;
      }
    },
    xAxis: {
      categories: [...Array(53).keys()].map(k => `W${k}`)
    },
    yAxis: {
      categories: Constants.DAYS,
      title: undefined,
      reversed: true
    },
    colorAxis: {
      min: 0,
      minColor: '#FFFFFF',
      maxColor: Highcharts.getOptions().colors![0]
    },
    chart: {
      events: {
        render(): void {
          const chart = this;
          const custom = chart.series[0].options.custom!;
          const component = custom.component;
          if (!component.yearLabel) {
            component.yearLabel = chart.renderer.label('', 48, 0).css({fontWeight: 'bold', fontSize: '14px'}).add();
            component.prevButton = chart.renderer.button('prev', 0, 0, () => {
              custom.byUser = true;
              custom.year--;
              component.updateDays(custom.data);
            }, { padding: 4 }).add();
            component.nextButton = chart.renderer.button('next', 100, 0, () => {
              custom.byUser = true;
              custom.year++;
              component.updateDays(custom.data);
            }, { padding: 4 }).add();
          }
        }
      }
    }
  };

  update(stats: TempStats): void {
    if (!this.chart || !stats.last) {
      return;
    }

    const custom = this.chart!.series[0].options.custom!;
    custom.first = stats.first?.date.getFullYear();
    custom.last = stats.last?.date.getFullYear();
    if (!custom.byUser && custom.last !== custom.year) {
      custom.year = custom.last;
    }
    this.updateDays(stats.specificDays);
  }

  updateDays(specificDays: { [p: number]: number }): void {
    const serie = this.chart!.series[0];
    const custom = serie.options.custom!;
    const entries = Object.entries(specificDays);
    const year = custom.year;

    const fdoy = new Date(year, 0, 1);
    if (fdoy.getDay() !== 0) {
      fdoy.setTime(fdoy.getTime() - (fdoy.getDay() * Constants.DAY));
    }
    const start = fdoy.getTime();
    const data = entries.map(e => {
      const key = parseInt(e[0]);
      const date = new Date(key);

      if (date.getFullYear() !== year) {
        return undefined;
      }

      const dow = date.getDay();
      const since = Math.floor(Math.round((key - start) / Constants.DAY) / 7);
      return [since, dow, e[1]];
    }).filter(r => r);

    serie.setData(data as number[][]);
    custom.year = year;
    custom.data = specificDays;
    custom.component.yearLabel?.attr({text: year});
    custom.component.prevButton.attr({visibility: year <= custom.first ? 'hidden' : 'visible', text: year - 1});
    custom.component.nextButton.attr({visibility: year >= custom.last ? 'hidden' : 'visible', text: year + 1});
  }
}