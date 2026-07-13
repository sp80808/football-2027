use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SimulationCore {
    player_x: f32,
    player_y: f32,
    ball_x: f32,
    ball_y: f32,
    ball_z: f32,
    ball_vel_x: f32,
    ball_vel_y: f32,
    ball_vel_z: f32,
}

#[wasm_bindgen]
impl SimulationCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SimulationCore {
        SimulationCore {
            player_x: 0.0,
            player_y: -5.0,
            ball_x: 0.0,
            ball_y: 0.0,
            ball_z: 0.0,
            ball_vel_x: 0.0,
            ball_vel_y: 0.0,
            ball_vel_z: 0.0,
        }
    }

    pub fn tick(&mut self, input_x: f32, input_y: f32) {
        let speed = 7.0;
        let dt = 1.0 / 120.0;
        
        self.player_x += input_x * speed * dt;
        self.player_y += input_y * speed * dt;

        if self.ball_z > 0.0 {
            self.ball_vel_z -= 9.81 * dt;
        }

        self.ball_x += self.ball_vel_x * dt;
        self.ball_y += self.ball_vel_y * dt;
        self.ball_z += self.ball_vel_z * dt;

        if self.ball_z < 0.0 {
            self.ball_z = 0.0;
            self.ball_vel_z = -self.ball_vel_z * 0.6;
            if self.ball_vel_z.abs() < 0.5 {
                self.ball_vel_z = 0.0;
            }
        }
    }

    pub fn get_state(&self) -> Vec<f32> {
        vec![
            self.player_x, self.player_y,
            self.ball_x, self.ball_y, self.ball_z
        ]
    }
}
