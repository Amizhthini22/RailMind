import random
import json
from typing import Dict, Any, Tuple, List, Optional
from .environment import RailwayDisruptionEnv
from mock_data import TRAIN_MAP, STATION_MAP

class QLearningReschedulerAgent:
    """
    Reinforcement Learning Q-Learning Agent for Train Rescheduling under Physical Constraints.
    Learns to minimize passenger delays, prevent platform clashes, and optimize loop overtakes.
    """
    def __init__(self, alpha: float = 0.15, gamma: float = 0.95, epsilon: float = 0.2):
        self.alpha = alpha      # Learning rate
        self.gamma = gamma      # Discount factor
        self.epsilon = epsilon  # Exploration rate
        self.q_table: Dict[str, List[float]] = {}
        self.training_history: List[Dict[str, Any]] = []
        self.total_episodes_trained = 0
        self.env = RailwayDisruptionEnv(TRAIN_MAP, STATION_MAP)
        
        # Pre-train on startup so the model is immediately capable
        self.pre_train(episodes=600)

    def _state_key(self, state: Tuple[int, int, int, int]) -> str:
        return f"d{state[0]}_s{state[1]}_a{state[2]}_sb{state[3]}"

    def _get_q_values(self, state_key: str) -> List[float]:
        if state_key not in self.q_table:
            # Initialize with small optimistic values
            self.q_table[state_key] = [100.0] * len(self.env.ACTIONS)
        return self.q_table[state_key]

    def select_action(self, state: Tuple[int, int, int, int], explore: bool = True) -> int:
        state_key = self._state_key(state)
        q_vals = self._get_q_values(state_key)
        
        if explore and random.random() < self.epsilon:
            return random.randint(0, len(self.env.ACTIONS) - 1)
        
        # Greedy action selection
        max_val = max(q_vals)
        best_actions = [i for i, v in enumerate(q_vals) if v == max_val]
        return random.choice(best_actions)

    def train_episode(self, delay_event: Optional[Dict[str, Any]] = None) -> float:
        state = self.env.reset(delay_event)
        state_key = self._state_key(state)
        
        action = self.select_action(state, explore=True)
        next_state, reward, done, info = self.env.step(action)
        
        # Q-Learning update rule: Q(s,a) = Q(s,a) + alpha * [reward + gamma * max_a' Q(s',a') - Q(s,a)]
        q_vals = self._get_q_values(state_key)
        next_state_key = self._state_key(next_state)
        next_max_q = max(self._get_q_values(next_state_key))
        
        old_val = q_vals[action]
        q_vals[action] = old_val + self.alpha * (reward + self.gamma * next_max_q - old_val)
        
        return reward

    def pre_train(self, episodes: int = 600):
        """Pre-trains agent on diverse disruption scenarios."""
        running_reward = 0.0
        for ep in range(1, episodes + 1):
            r = self.train_episode()
            running_reward = 0.95 * running_reward + 0.05 * r if ep > 1 else r
            self.total_episodes_trained += 1
            
            # Record progress every 50 episodes
            if ep % 50 == 0:
                self.training_history.append({
                    "episode": self.total_episodes_trained,
                    "avg_reward": round(running_reward, 2),
                    "epsilon": round(max(0.02, self.epsilon * (0.995 ** ep)), 3),
                    "q_states_discovered": len(self.q_table)
                })

        # Decay epsilon after pre-training for inference mode
        self.epsilon = 0.05

    def get_optimal_reschedule(self, delay_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inference: Uses the trained Q-policy to generate optimal recovery plan
        for a live disruption event.
        """
        state = self.env.reset(delay_event)
        action_idx = self.select_action(state, explore=False)
        _, reward, _, info = self.env.step(action_idx)
        
        state_key = self._state_key(state)
        q_distribution = {
            self.env.ACTIONS[i]: round(val, 2)
            for i, val in enumerate(self._get_q_values(state_key))
        }

        return {
            "selected_action": self.env.ACTIONS[action_idx],
            "action_idx": action_idx,
            "reschedule_plan": info["reschedule_plan"],
            "platform_allocations": info["platform_allocations"],
            "eval_result": info["eval_result"],
            "pax_delay_minutes": info["pax_delay_minutes"],
            "explanation": info["explanation"],
            "q_distribution": q_distribution,
            "reward": round(reward, 2)
        }

# Global RL Rescheduler Agent Instance
RL_RESCHEDULER = QLearningReschedulerAgent()
