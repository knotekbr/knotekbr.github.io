class Floater {

    static area = {
        w: 0,
        h: 0
    }
    static setArea(width, height) {
        if (typeof width === 'number' && typeof height === 'number') {
            this.area.w = width;
            this.area.h = height;
        }
    }

    static colors = ['#66FF66', '#50BFE6', '#FF9933', '#FF6EFF'];
    static bgColor = '#232323';
    static randomColor() {
        let ci = Math.floor(Math.random() * this.colors.length);
        return this.colors[ci];
    }

    static radius = 10;

    constructor(randStart = false) {
        this.pos = {
            startX: Math.random() * (Floater.area.w + 4 * Floater.radius) - 2 * Floater.radius,
            x: 0,
            y: 0
        };

        if (randStart) {
            this.pos.y = Math.random() * Floater.area.h;
            this.pos.x = this.pos.startX + 10 * Math.sin(Math.abs(this.pos.y / 10));
        }
        else {
            this.pos.y = Floater.area.h + (2 * Floater.radius);
            this.pos.x = Math.random() * Floater.area.w;
        }

        this.yVel = (Math.random() * 10) + 5;
        this.color = Floater.randomColor();
    }

    update(elapsed, drift) {
        this.pos.y -= elapsed * this.yVel;
        if (this.pos.y < -2 * Floater.radius) {
            return false;
        }

        this.pos.x = this.pos.startX + drift + 10 * Math.sin(Math.abs(this.pos.y / 10));

        return true;
    }

    draw(ctx) {
        let grd = ctx.createRadialGradient(
            this.pos.x, this.pos.y, 1,
            this.pos.x, this.pos.y, Floater.radius
        );
        grd.addColorStop(0, this.color + '88');
        grd.addColorStop(0.5, this.color + '22');
        grd.addColorStop(0.75, this.color + '06');
        grd.addColorStop(1, this.color + '00');

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, Floater.radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = grd;
        ctx.fill();
    }

}

class Background {

    constructor(cnv = null, maxFloaters = 100) {
        if (!(cnv instanceof HTMLCanvasElement)) {
            throw new Error('Background object requires an HTMLCanvasElement');
        }

        this.cnv = cnv;
        this.cnv.width = window.innerWidth;
        this.cnv.height = window.innerHeight;
        this.ctx = this.cnv.getContext('2d');

        Floater.setArea(this.cnv.width, this.cnv.height);
        this.floaters = [];
        for (let i = 0; i < maxFloaters; i++) {
            this.floaters.push(new Floater(true));
        }

        this.lastFrame = 0;
        this.drift = 0;
    }

    update(elapsed) {
        for (let i = 0; i < this.floaters.length; i++) {
            if (!this.floaters[i].update(elapsed, this.drift)) {
                this.floaters[i] = new Floater();
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#232323';
        this.ctx.fillRect(0, 0, this.cnv.width, this.cnv.height);

        for (const floater of this.floaters) {
            floater.draw(this.ctx);
        }
    }

    generateFrame() {
        let currFrame = Date.now();
        let elapsed = (currFrame - this.lastFrame) / 1000;
        this.lastFrame = currFrame;

        this.update(elapsed);
        this.draw();
        requestAnimationFrame(() => this.generateFrame());
    }

    start() {
        this.lastFrame = Date.now();
        this.generateFrame();
    }

}

const landingPage = function() {
    let wrapper = document.getElementById('wrapper');
    let panel = document.getElementById('panel');

    this.background = new Background(document.getElementById('bg'));
    this.background.start();

    wrapper.addEventListener('pointermove', e => {
        let xr = 10 * ((wrapper.clientHeight / 2) - e.pageY) / (wrapper.clientHeight / 2);
        let yr = 10 * (e.pageX - (wrapper.clientWidth / 2)) / (wrapper.clientWidth / 2);

        panel.style.setProperty('--x-rot', `${xr}deg`);
        panel.style.setProperty('--y-rot', `${yr}deg`);

        this.background.drift = yr;
    });
};

const app = new landingPage();