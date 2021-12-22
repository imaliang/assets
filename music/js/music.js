const player = new APlayer({
    element: document.getElementById('player'),
    mini: false,//迷你模式
    fixed: false,//吸底模式
    autoplay: true,
    lrcType: false,//
    mutex: true,
    theme: 'rgb(194,12,12)',
    order: 'list',
    listMaxHeight: '600px',
    audio: [
        {
            name: '大头皮鞋',
            artist: '韩晓',
            url: 'http://m10.music.126.net/20211220192538/0e62e47fad508457f42e42e81fd16c57/ymusic/obj/w5zDlMODwrDDiGjCn8Ky/3047811746/ecdb/b511/5061/648e19e0bdf045c4c559acb24ad2441d.mp3',
            cover: 'https://p2.music.126.net/VIjxW7mevNwMbWQLR_iYIw==/111050674406169.jpg?param=90y90',
            theme: '#468b66'
        },
        {
            name: '2002年的第一场雪',
            artist: '刀郎',
            url: 'https://video.aliang.link/d/云上音乐/01. 2002年的第一场雪.flac',
            cover: 'https://p2.music.126.net/dCMVhVKVSVi9LQ6cBp_rTg==/109951163281535703.jpg?param=130y130',
            theme: '#46718b'
        }
    ]
});