# maptalks.markercluster

[![CircleCI](https://circleci.com/gh/maptalks/maptalks.markercluster.svg?style=shield)](https://circleci.com/gh/MapTalks/maptalks.markercluster)
[![NPM Version](https://img.shields.io/npm/v/maptalks.markercluster.svg)](https://github.com/maptalks/maptalks.markercluster)

A plugin of [maptalks.js](https://github.com/maptalks/maptalks.js) to draw markers as clusters.

![screenshot](https://cloud.githubusercontent.com/assets/13678919/25312742/3036acb0-2853-11e7-8e9b-baf58e318a9b.jpg)

## Examples

* marker clusters of [50000 points](https://maptalks.github.io/maptalks.markercluster/demo/). (data from [Leaflet.Heat](https://github.com/Leaflet/Leaflet.heat))

## Install
  
* Install with npm: ```npm install maptalks.markercluster```. 
* Download from [dist directory](https://github.com/maptalks/maptalks.markercluster/tree/gh-pages/dist).
* Use unpkg CDN: ```https://unpkg.com/maptalks.markercluster/dist/maptalks.markercluster.min.js```

## Usage

As a plugin, ```maptalks.markercluster``` must be loaded after ```maptalks.js``` in browsers.
```html
<script type="text/javascript" src="https://unpkg.com/maptalks/dist/maptalks.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/maptalks.markercluster/dist/maptalks.markercluster.min.js"></script>
<script>
var data = [marker1, marker2, marker3];
var clusterLayer = new maptalks.ClusterLayer('cluster', data).addTo(map);
</script>
```

## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## API Reference

```ClusterLayer``` is a subclass of [maptalks.VectorLayer](https://maptalks.github.io/docs/api/VectorLayer.html) and inherits all the methods of its parent.

### `Constructor`

```javascript
new maptalks.ClusterLayer(id, data, options)
```

* id **String** layer id
* data **Marker[]** layer data, an array of maptalks.Marker
* options **Object** options
    * maxClusterRadius **Number** max cluster radius (160 by default) 
    * symbol **Object** symbol of clusters
    * textSymbol **Object**  symbol of cluster texts
    * drawClusterText **Boolean** whether to draw cluster texts (true by default)
    * maxClusterZoom **Number** the max zoom to draw as clusters (null by default)
    * animation **Boolean** whether animate the clusters when zooming (true by default)
    * animationDuration **Number** the animation duration
    * Other options defined in [maptalks.VectorLayer](https://maptalks.github.io/docs/api/VectorLayer.html)

### `config(key, value)`

config layer's options and redraw the layer if necessary

```javascript
clusterLayer.config('maxClusterRadius', 100);
clusterLayer.config({
    'textSymbol' : {
        'textFaceName'      : 'monospace',
        'textSize'          : 16
    }
});
```

**Returns** `this`

### `addMarker(marker)`

add more markers

* marker **Marker[]** markers to add

**Returns** `this`

### `toJSON()`

export the layer's JSON.

```javascript
var json = clusterLayer.toJSON();
```

**Returns** `Object`

## Contributing

We welcome any kind of contributions including issue reportings, pull requests, documentation corrections, feature requests and any other helps.

## Develop

The only source file is ```index.js```.

It is written in ES6, transpiled by [babel](https://babeljs.io/) and tested with [mocha](https://mochajs.org) and [expect.js](https://github.com/Automattic/expect.js).

### Scripts

* Install dependencies
```shell
$ npm install
```

* Watch source changes and generate runnable bundle repeatedly
```shell
$ gulp watch
```

* Tests
```shell
$ npm test
```

* Watch source changes and run tests repeatedly
```shell
$ gulp tdd
```

* Package and generate minified bundles to dist directory
```shell
$ gulp minify
```

* Lint
```shell
$ npm run lint
```
