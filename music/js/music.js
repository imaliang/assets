const player = new APlayer({
    element: document.getElementById('player'),
    mini: false,//迷你模式
    fixed: false,//吸底模式
    autoplay: true,
    lrcType: false,//
    mutex: true,
    theme: '#C20C0C',
    order: 'list',
    listMaxHeight: '600px',
    audio: [
        {
            name: '2002年的第一场雪',
            artist: '刀郎',
            url: 'https://video.aliang.link/d/天翼云/刀郎 - 2002年的第一场雪.flac',
            cover: 'https://video.aliang.link/d/天翼云/刀郎 - 2002年的第一场雪.jpg',
            lrc: 'https://video.aliang.link/d/天翼云/刀郎 - 2002年的第一场雪.lrc',
            theme: '#31c27c'
        }, {
            name: '不如 (女声正式版)',
            artist: '也可',
            url: 'https://video.aliang.link/d/天翼云/也可 - 不如 (女声正式版).flac',
            cover: 'https://video.aliang.link/d/天翼云/也可 - 不如 (女声正式版).jpg',
            lrc: 'https://video.aliang.link/d/天翼云/也可 - 不如 (女声正式版).lrc',
            theme: '#6739b6'
        }, {
            name: '机器铃 砍菜刀',
            artist: '张卫',
            url: 'https://video.aliang.link/d/天翼云/张卫 - 机器铃 砍菜刀.flac',
            cover: 'https://video.aliang.link/d/天翼云/张卫 - 机器铃 砍菜刀.jpg',
            lrc: 'https://video.aliang.link/d/天翼云/张卫 - 机器铃 砍菜刀.lrc',
            theme: '#C20C0C'
        }
    ]
});