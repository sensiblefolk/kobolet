import { Injectable } from '@angular/core';
import * as Chart from 'chart.js';
import * as Chartist from 'chartist';

declare let $: any;
declare const window: Window;

@Injectable({
  providedIn: 'root',
})
export class ChartService {
  colors: any = {
    brand: '#716aca',
    metal: '#c4c5d6',
    light: '#ffffff',
    accent: '#00c5dc',
    primary: '#5867dd',
    success: '#34bfa3',
    info: '#0098ff',
    warning: '#ffb822',
    danger: '#f4516c',
  };
  // window: Window = window;

  constructor() {}

  // == Daily Sales chart.
  // ** Based on Chartjs plugin - http://www.chartjs.org/
  getChartJs(): any {
    const chartContainer = $('#m_chart_daily_sales');
    if (chartContainer.length === 0) {
      return;
    }

    const chartData = {
      // tslint:disable-next-line:max-line-length
      labels: [
        'Label 1',
        'Label 2',
        'Label 3',
        'Label 4',
        'Label 5',
        'Label 6',
        'Label 7',
        'Label 8',
        'Label 9',
        'Label 10',
        'Label 11',
        'Label 12',
        'Label 13',
        'Label 14',
        'Label 15',
        'Label 16',
      ],
      datasets: [
        {
          // label: 'Dataset 1',
          backgroundColor: this.colors.success,
          data: [
            15,
            20,
            25,
            30,
            25,
            20,
            15,
            20,
            25,
            30,
            25,
            20,
            15,
            10,
            15,
            20,
          ],
        },
        {
          // label: 'Dataset 2',
          backgroundColor: '#f3f3fb',
          data: [
            15,
            20,
            25,
            30,
            25,
            20,
            15,
            20,
            25,
            30,
            25,
            20,
            15,
            10,
            15,
            20,
          ],
        },
      ],
    };

    const chart = new Chart(chartContainer, {
      type: 'bar',
      data: chartData,
      options: {
        title: {
          display: false,
        },
        tooltips: {
          intersect: false,
          mode: 'nearest',
          xPadding: 10,
          yPadding: 10,
          caretPadding: 10,
        },
        legend: {
          display: false,
        },
        responsive: true,
        maintainAspectRatio: false,
        barRadius: 4,
        scales: {
          xAxes: [
            {
              display: false,
              gridLines: false,
              stacked: true,
            },
          ],
          yAxes: [
            {
              display: false,
              stacked: true,
              gridLines: false,
            },
          ],
        },
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          },
        },
      },
    });
  }

  // == Profit Share Chart.
  // ** Based on Chartist plugin - https://gionkunz.github.io/chartist-js/index.html
  getUnpaidChartist(bitcoin: any, ethereum: any): void {
    let totalSum: any;
    let btcPercent: any;
    let ethPercent: any;

    if ($('#m_chart_profit_share').length === 0) {
      return;
    }

    if (bitcoin > 0 || ethereum > 0) {
      totalSum = bitcoin + ethereum;
      btcPercent = (bitcoin / totalSum) * 100;
      ethPercent = (ethereum / totalSum) * 100;
    } else if (bitcoin === 0 && ethereum === 0) {
      btcPercent = 50;
      ethPercent = 50;
    }

    const chart = new Chartist.Pie(
      '#m_chart_profit_share',
      {
        series: [
          {
            value: btcPercent,
            className: 'custom',
            meta: {
              color: this.colors.warning,
            },
          },
          {
            value: ethPercent,
            className: 'custom',
            meta: {
              color: this.colors.info,
            },
          },
        ],
        labels: [1, 2],
      },
      {
        donut: true,
        donutWidth: 10,
        showLabel: false,
      }
    );

    chart.on('draw', (data) => {
      if (data.type === 'slice') {
        // Get the total path length in order to use for dash array animation
        const pathLength = data.element._node.getTotalLength();

        // Set a dasharray that matches the path length as prerequisite to animate dashoffset
        data.element.attr({
          'stroke-dasharray': pathLength + 'px ' + pathLength + 'px',
        });

        // Create animation definition while also assigning an ID to the animation for later sync usage
        const animationDefinition: any = {
          'stroke-dashoffset': {
            id: 'anim' + data.index,
            dur: 1000,
            from: -pathLength + 'px',
            to: '0px',
            easing: Chartist.Svg.Easing.easeOutQuint,
            // We need to use `fill: 'freeze'` otherwise our animation will fall back to initial (not visible)
            fill: 'freeze',
            stroke: data.meta.color,
          },
        };

        // tslint:disable-next-line:max-line-length
        // If this was not the first slice, we need to time the animation so that it uses the end sync event of the previous animation
        if (data.index !== 0) {
          animationDefinition['stroke-dashoffset'].begin =
            'anim' + (data.index - 1) + '.end';
        }

        // We need to set an initial value before the animation starts as we are not in guided mode which would do that for us

        data.element.attr({
          'stroke-dashoffset': -pathLength + 'px',
          stroke: data.meta.color,
        });

        // We can't use guided mode as the animations need to rely on setting begin manually
        // See http://gionkunz.github.io/chartist-js/api-documentation.html#chartistsvg-function-animate
        data.element.animate(animationDefinition, false);
      }
    });

    // For the sake of the example we update the chart every time it's created with a delay of 8 seconds
    /*  chart.on('created', function() {
            if (this.window.__anim21278907124) {
                clearTimeout(this.window.__anim21278907124);
                this.window.__anim21278907124 = null;
            }
            this.window.__anim21278907124 = setTimeout(chart.update.bind(chart), 15000);
        }); */
  }

  round(digit: number, precision?: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(digit * factor) / factor;
  }
}
