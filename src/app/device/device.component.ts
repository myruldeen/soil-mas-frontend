import { Component, OnInit, OnDestroy } from '@angular/core';
import { DevicesService } from '../services/devices.service';
import { Params, ActivatedRoute } from '@angular/router';
import { SocketService } from '../services/socket.service';
import { DataService } from '../services/data.service';
import { NotificationsService } from 'angular2-notifications';
@Component({
	selector: 'app-device',
	templateUrl: './device.component.html',
	styleUrls: [ './device.component.css' ]
})
export class DeviceComponent implements OnInit, OnDestroy {
	device: any;
	data: Array<any>;
	toggleState: boolean = false;
	private subDevice: any;
	private subData: any;
	lastRecord: any;

	// line chart config
	public lineChartOptions: any = {
		responsive: true,
		legend: {
			position: 'bottom'
		},
		hover: {
			mode: 'label'
		},
		scales: {
			xAxes: [
				{
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Time'
					}
				}
			],
			yAxes: [
				{
					display: true,
					ticks: {
						beginAtZero: true,
						steps: 10,
						stepValue: 5,
						max: 100
					}
				}
			]
		},
		title: {
			display: true,
			text: 'Temperature & Humidity vs. Time'
		}
	};
	public lineChartLegend: boolean = true;
	public lineChartType: string = 'line';
	public lineChartData: Array<any> = [];
	public lineChartLabels: Array<any> = [];

	// Gauge Chart
	public canvasWidth = 300;
	public needleValue: any;
	public centralLabel = '';
	public name: string = 'Temp';

	public tempLbl: string = 'Temp';
	public humdLbl: string = 'Humidity';
	public needleTemp: any;
	public bottomTemp: any;
	public needleHumd: any;
	public bottomHumd: any;

	public bottomLabel: any;
	public options = {
		hasNeedle: true,
		needleColor: 'gray',
		needleUpdateSpeed: 1000,
		arcColors: [ 'rgb(44, 151, 222)', 'lightgray' ],
		arcDelimiters: [ 30 ],
		rangeLabel: [ '0', '100' ],
		needleStartValue: 50
	};

	constructor(
		private deviceService: DevicesService,
		private socketService: SocketService,
		private dataService: DataService,
		private route: ActivatedRoute,
		private notificationsService: NotificationsService
	) {}

	ngOnInit() {
		this.subDevice = this.route.params.subscribe((params) => {
			this.deviceService.getOne(params['id']).subscribe((response) => {
				this.device = response.json();
				this.getData();
				this.socketInit();
			});
		});
	}
	getData() {
		this.dataService.get(this.device.macAddress).subscribe((response) => {
			this.data = response.json();
			this.genChart();
			this.lastRecord = this.data[0]; // descending order data
			if (this.lastRecord) {
				this.toggleState = this.lastRecord.data.l;
			}
		});
	}
	toggleChange(state) {
		let data = {
			macAddress: this.device.macAddress,
			data: {
				t: this.lastRecord.data.t,
				h: this.lastRecord.data.h,
				l: state ? 1 : 0
			},
			topic: 'led'
		};
		this.dataService.create(data).subscribe(
			(resp) => {
				if (resp.json()._id) {
					this.notificationsService.success('Device Notified!');
				}
			},
			(err) => {
				console.log(err);
				this.notificationsService.error('Device Notification Failed. Check console for the error!');
			}
		);
	}
	socketInit() {
		this.subData = this.socketService.getData(this.device.macAddress).subscribe((data) => {
			if (this.data.length <= 0) return;
			this.data.splice(this.data.length - 1, 1); // remove the last record
			this.data.push(data); // add the new one
			this.lastRecord = data;
			this.genChart();
		});
	}
	ngOnDestroy() {
		this.subDevice.unsubscribe();
		this.subData ? this.subData.unsubscribe() : '';
	}
	genChart() {
		let data = this.data;
		let _dtArr: Array<any> = [];
		let _lblArr: Array<any> = [];
		let tmpArr: Array<any> = [];
		let humArr: Array<any> = [];
		for (var i = 0; i < data.length; i++) {
			let _d = data[i];
			tmpArr.push(_d.data.t);
			humArr.push(_d.data.h);
			_lblArr.push(this.formatDate(_d.createdAt));
		}
		// reverse data to show the latest on the right side
		tmpArr.reverse();
		humArr.reverse();
		_lblArr.reverse();
		_dtArr = [
			{
				data: tmpArr,
				label: 'Temperature'
			},
			{
				data: humArr,
				label: 'Humidity %'
			}
		];
		this.lineChartData = _dtArr;
		this.lineChartLabels = _lblArr;
		// this.needleValue = tmpArr[tmpArr.length - 1];
		// this.bottomLabel = tmpArr[tmpArr.length - 1];
		// this.needleTemp = tmpArr[tmpArr.length - 1];
		// this.bottomTemp = tmpArr[tmpArr.length - 1];

		// this.needleHumd = humArr[humArr.length - 1];
		// this.bottomHumd = humArr[humArr.length - 1];
	}
	private formatDate(originalTime) {
		var d = new Date(originalTime);
		var datestring =
			d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes();
		return datestring;
	}
}
