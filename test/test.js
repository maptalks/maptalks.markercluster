describe('ClusterLayer', function () {
    var container, map;
    beforeEach(function () {
        container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '300px';
        document.body.appendChild(container);
        map = new maptalks.Map(container, {
            center : [0, 0],
            zoom : 17
        });
    });

    afterEach(function () {
        maptalks.DomUtil.removeDomNode(container);
    });

    it('add to map', function (done) {
        var layer = new maptalks.ClusterLayer('g');
        layer.on('layerload', function () {
            expect(layer).to.be.painted();
            done();
        })
         .addTo(map);
    });

    it('add again', function (done) {
        var layer = new maptalks.ClusterLayer('g', {
            projection : true,
            center : map.getCenter(),
            width : 100,
            height : 100,
            cols : [-5, 5],
            rows : [-5, 5]
        });
        layer.once('layerload', function () {
            expect(layer).to.be.painted();
            map.removeLayer(layer);
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            map.addLayer(layer);
        });
        map.addLayer(layer);
    });

    it('with a symbol', function (done) {
        var symbol = {
            'lineColor' : '#000',
            'lineOpacity' : 1,
            'polygonFill' : 'rgb(0, 0, 0)',
            'polygonOpacity' : 0.4
        };
        var layer = new maptalks.ClusterLayer('g', {
            projection : true,
            center : map.getCenter(),
            width : 100,
            height : 100,
            cols : [-5, 5],
            rows : [-5, 5]
        }, {
            'symbol' : symbol
        });
        layer.on('layerload', function () {
            expect(layer).to.be.painted();
            done();
        })
        .addTo(map);
    });

    describe('test layer with data', function () {
        function testLayerWithData(done, data) {
            var layer = new maptalks.ClusterLayer('g', {
                projection : true,
                center : map.getCenter(),
                width : 100,
                height : 100,
                cols : [-5, 5],
                rows : [-5, 5],
                data : data
            });
            layer.on('layerload', function () {
                expect(layer).to.be.painted();
                done();
            })
            .addTo(map);
        }

        it('with data of text symbol', function (done) {
            testLayerWithData(done, [
                [
                    [1, 2], 4, { 'property' : { 'foo':1 }, 'symbol' : {
                        'textName' : 'text',
                        'textSize' : { type:'interval', stops: [[0, 0], [16, 5], [17, 10], [18, 20], [19, 40]] }
                    }},
                    [4, [2, 3], { 'symbol' : { 'textName' : 'text', 'textSize' : 14 }}]
                ]
            ]);
        });
    });
});
