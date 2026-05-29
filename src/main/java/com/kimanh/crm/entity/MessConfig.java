package com.kimanh.crm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;

@Entity
@Table(name = "mess_config", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessConfig implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", unique = true, nullable = false)
    private String configKey;

    @Column(name = "config_value", nullable = false)
    private String configValue;

    @Column(name = "description")
    private String description;
}
